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
  private let maxVisiblePerPosition = 3

  private var visibleTop: [String] = []
  private var visibleBottom: [String] = []
  private var pendingTop: [ToastPayload] = []
  private var pendingBottom: [ToastPayload] = []

  private var payloadsById: [String: ToastPayload] = [:]

  func enqueue(_ payload: ToastPayload) -> ToastInsertion? {
    payloadsById[payload.id] = payload

    switch payload.position {
    case .top:
      if visibleTop.count < maxVisiblePerPosition {
        visibleTop.insert(payload.id, at: 0)
        return ToastInsertion(payload: payload, placement: .nearEdge)
      }
      pendingTop.append(payload)
      return nil
    case .bottom:
      if visibleBottom.count < maxVisiblePerPosition {
        visibleBottom.append(payload.id)
        return ToastInsertion(payload: payload, placement: .nearEdge)
      }
      pendingBottom.append(payload)
      return nil
    }
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
}
