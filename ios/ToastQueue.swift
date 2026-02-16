import Foundation

enum ToastDismissReason: String {
  case timeout
  case swipe
  case programmatic
  case replaced
}

enum ToastVariant: String {
  case success
  case error
  case info
  case loading
}

enum ToastPosition: String {
  case top
  case bottom
}

enum ToastSizeMode: String {
  case fitContent = "fit-content"
  case fillWidth = "fill-width"
}

enum ToastImportance: String {
  case low
  case normal
  case high
}

enum ToastDropPolicy: String {
  case oldest
  case newest
}

struct ToastPayload {
  let id: String
  let variant: ToastVariant
  let title: String?
  let message: String
  let actionLabel: String?
  let durationMs: Int
  let position: ToastPosition
  let size: ToastSizeMode
  let haptics: Bool
  let accessibilityLabel: String?
  let announce: Bool
  let importance: ToastImportance
  let reducedMotion: Bool
}

enum ToastInsertionPlacement {
  case nearEdge
  case farEdge
}

struct ToastInsertion {
  let payload: ToastPayload
  let placement: ToastInsertionPlacement
}

enum ToastDismissTarget {
  case visible(String)
  case pending(ToastPayload)
  case none
}

final class ToastQueue {
  private var maxVisiblePerPosition = 3
  private var maxQueuePerPosition = 50
  private var dropPolicy: ToastDropPolicy = .oldest

  private var visibleTop: [String] = []
  private var visibleBottom: [String] = []
  private var pendingTop: [ToastPayload] = []
  private var pendingBottom: [ToastPayload] = []

  private var payloadsById: [String: ToastPayload] = [:]

  func enqueue(_ payload: ToastPayload) -> (insertion: ToastInsertion?, dropped: ToastPayload?) {
    payloadsById[payload.id] = payload

    switch payload.position {
    case .top:
      if visibleTop.count < maxVisiblePerPosition {
        visibleTop.insert(payload.id, at: 0)
        return (ToastInsertion(payload: payload, placement: .nearEdge), nil)
      }
      var dropped: ToastPayload? = nil
      if maxQueuePerPosition == 0 {
        payloadsById.removeValue(forKey: payload.id)
        return (nil, payload)
      }
      if pendingTop.count >= maxQueuePerPosition {
        if dropPolicy == .newest {
          // Drop incoming payload when configured to prefer older queued toasts.
          payloadsById.removeValue(forKey: payload.id)
          return (nil, payload)
        }
        dropped = dropFromPending(&pendingTop)
      }
      if dropped?.id == payload.id {
        payloadsById.removeValue(forKey: payload.id)
        return (nil, dropped)
      }
      pendingTop.append(payload)
      return (nil, dropped)
    case .bottom:
      if visibleBottom.count < maxVisiblePerPosition {
        visibleBottom.append(payload.id)
        return (ToastInsertion(payload: payload, placement: .nearEdge), nil)
      }
      var dropped: ToastPayload? = nil
      if maxQueuePerPosition == 0 {
        payloadsById.removeValue(forKey: payload.id)
        return (nil, payload)
      }
      if pendingBottom.count >= maxQueuePerPosition {
        if dropPolicy == .newest {
          // Drop incoming payload when configured to prefer older queued toasts.
          payloadsById.removeValue(forKey: payload.id)
          return (nil, payload)
        }
        dropped = dropFromPending(&pendingBottom)
      }
      if dropped?.id == payload.id {
        payloadsById.removeValue(forKey: payload.id)
        return (nil, dropped)
      }
      pendingBottom.append(payload)
      return (nil, dropped)
    }
  }

  func updateConfiguration(
    maxVisiblePerPosition: Int,
    maxQueuePerPosition: Int,
    dropPolicy: ToastDropPolicy
  ) -> [ToastPayload] {
    self.maxVisiblePerPosition = maxVisiblePerPosition
    self.maxQueuePerPosition = maxQueuePerPosition
    self.dropPolicy = dropPolicy

    var dropped: [ToastPayload] = []
    dropped.append(contentsOf: trimPendingQueue(&pendingTop))
    dropped.append(contentsOf: trimPendingQueue(&pendingBottom))

    for removed in dropped {
      payloadsById.removeValue(forKey: removed.id)
    }

    return dropped
  }

  func dismissTarget(id: String?) -> ToastDismissTarget {
    if let id {
      if containsVisible(id: id) {
        return .visible(id)
      }

      if let removed = removePending(id: id) {
        payloadsById.removeValue(forKey: id)
        return .pending(removed)
      }

      return .none
    }

    if let visibleId = visibleTop.first {
      return .visible(visibleId)
    }

    if let visibleId = visibleBottom.last {
      return .visible(visibleId)
    }

    if let removed = popFirstPending() {
      payloadsById.removeValue(forKey: removed.id)
      return .pending(removed)
    }

    return .none
  }

  func completeVisibleDismiss(id: String, allowPromotion: Bool) -> (removed: ToastPayload?, promoted: ToastInsertion?) {
    guard let removed = payloadsById.removeValue(forKey: id) else {
      return (nil, nil)
    }

    switch removed.position {
    case .top:
      visibleTop.removeAll { $0 == id }

      guard allowPromotion, !pendingTop.isEmpty else {
        return (removed, nil)
      }

      let promoted = pendingTop.removeFirst()
      visibleTop.append(promoted.id)
      return (removed, ToastInsertion(payload: promoted, placement: .farEdge))

    case .bottom:
      visibleBottom.removeAll { $0 == id }

      guard allowPromotion, !pendingBottom.isEmpty else {
        return (removed, nil)
      }

      let promoted = pendingBottom.removeFirst()
      visibleBottom.insert(promoted.id, at: 0)
      return (removed, ToastInsertion(payload: promoted, placement: .farEdge))
    }
  }

  func visibleIds() -> [String] {
    visibleTop + visibleBottom
  }

  func pendingPayloads() -> [ToastPayload] {
    pendingTop + pendingBottom
  }

  func payload(for id: String) -> ToastPayload? {
    payloadsById[id]
  }

  func isVisible(id: String) -> Bool {
    containsVisible(id: id)
  }

  func updatePayload(_ payload: ToastPayload) {
    guard payloadsById[payload.id] != nil else {
      return
    }

    payloadsById[payload.id] = payload

    if let index = pendingTop.firstIndex(where: { $0.id == payload.id }) {
      pendingTop[index] = payload
    }

    if let index = pendingBottom.firstIndex(where: { $0.id == payload.id }) {
      pendingBottom[index] = payload
    }
  }

  func clearPending() {
    for payload in pendingTop {
      payloadsById.removeValue(forKey: payload.id)
    }
    for payload in pendingBottom {
      payloadsById.removeValue(forKey: payload.id)
    }

    pendingTop.removeAll()
    pendingBottom.removeAll()
  }

  var hasVisibleToasts: Bool {
    !visibleTop.isEmpty || !visibleBottom.isEmpty
  }

  var pendingTopCount: Int {
    pendingTop.count
  }

  var pendingBottomCount: Int {
    pendingBottom.count
  }

  private func containsVisible(id: String) -> Bool {
    visibleTop.contains(id) || visibleBottom.contains(id)
  }

  private func removePending(id: String) -> ToastPayload? {
    if let index = pendingTop.firstIndex(where: { $0.id == id }) {
      return pendingTop.remove(at: index)
    }

    if let index = pendingBottom.firstIndex(where: { $0.id == id }) {
      return pendingBottom.remove(at: index)
    }

    return nil
  }

  private func popFirstPending() -> ToastPayload? {
    if !pendingTop.isEmpty {
      return pendingTop.removeFirst()
    }

    if !pendingBottom.isEmpty {
      return pendingBottom.removeFirst()
    }

    return nil
  }

  private func trimPendingQueue(_ pending: inout [ToastPayload]) -> [ToastPayload] {
    guard maxQueuePerPosition >= 0 else {
      return []
    }

    var removed: [ToastPayload] = []
    while pending.count > maxQueuePerPosition {
      if let payload = dropFromPending(&pending) {
        removed.append(payload)
      } else {
        break
      }
    }
    return removed
  }

  private func dropFromPending(_ pending: inout [ToastPayload]) -> ToastPayload? {
    guard !pending.isEmpty else {
      return nil
    }

    switch dropPolicy {
    case .oldest:
      return pending.removeFirst()
    case .newest:
      return pending.removeLast()
    }
  }
}
