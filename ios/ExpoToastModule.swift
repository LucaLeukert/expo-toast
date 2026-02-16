import ExpoModulesCore
import Foundation

internal struct ToastPayloadRecord: Record {
  @Field
  var id: String = UUID().uuidString

  @Field
  var variant: String = "info"

  @Field
  var title: String?

  @Field
  var message: String = ""

  @Field
  var actionLabel: String?

  @Field
  var durationMs: Double = 3000

  @Field
  var position: String = "top"

  @Field
  var size: String = "fit-content"

  @Field
  var haptics: Bool = true
}

internal struct ToastTransitionRecord: Record {
  @Field
  var id: String = ""

  @Field
  var variant: String?

  @Field
  var title: String?

  @Field
  var message: String?

  @Field
  var actionLabel: String?

  @Field
  var clearTitle: Bool?

  @Field
  var clearAction: Bool?

  @Field
  var durationMs: Double?

  @Field
  var size: String?

  @Field
  var haptics: Bool?
}

public class ExpoToastModule: Module, ToastPresenterDelegate {
  private let queue = ToastQueue()
  private var isDismissingAll = false

  public func definition() -> ModuleDefinition {
    Name("ExpoToast")

    Events("onToastShow", "onToastDismiss", "onToastActionPress")

    Function("isSupported") { () -> Bool in
      Self.supportsCurrentPlatform()
    }

    AsyncFunction("show") { (payload: ToastPayloadRecord) in
      guard Self.supportsCurrentPlatform() else {
        return
      }

      let parsed = Self.parse(payload: payload)
      if let insertion = queue.enqueue(parsed) {
        ToastPresenter.shared.present(insertion)
      }
      syncCollapsedIndicators()
    }
    .runOnQueue(.main)

    AsyncFunction("dismiss") { (id: String?) in
      guard Self.supportsCurrentPlatform() else {
        return
      }

      let target = queue.dismissTarget(id: id)

      switch target {
      case .visible(let visibleId):
        ToastPresenter.shared.dismiss(id: visibleId, reason: .programmatic)
      case .pending(let removed):
        sendEvent("onToastDismiss", [
          "id": removed.id,
          "reason": ToastDismissReason.programmatic.rawValue
        ])
        syncCollapsedIndicators()
      case .none:
        break
      }
    }
    .runOnQueue(.main)

    AsyncFunction("transition") { (payload: ToastTransitionRecord) in
      guard Self.supportsCurrentPlatform() else {
        return
      }

      guard let current = queue.payload(for: payload.id) else {
        return
      }

      let next = Self.mergeTransition(current: current, transition: payload)
      queue.updatePayload(next)

      if queue.isVisible(id: next.id) {
        ToastPresenter.shared.transition(id: next.id, to: next)
      }
    }
    .runOnQueue(.main)

    AsyncFunction("dismissAll") {
      guard Self.supportsCurrentPlatform() else {
        return
      }

      isDismissingAll = true

      let pending = queue.pendingPayloads()
      queue.clearPending()
      syncCollapsedIndicators()

      for payload in pending {
        sendEvent("onToastDismiss", [
          "id": payload.id,
          "reason": ToastDismissReason.programmatic.rawValue
        ])
      }

      for id in queue.visibleIds() {
        ToastPresenter.shared.dismiss(id: id, reason: .programmatic)
      }

      if !queue.hasVisibleToasts {
        isDismissingAll = false
      }
    }
    .runOnQueue(.main)

    OnCreate {
      ToastPresenter.shared.delegate = self
    }

    OnDestroy {
      if ToastPresenter.shared.delegate === self {
        ToastPresenter.shared.delegate = nil
      }
    }
  }

  func toastDidShow(id: String) {
    sendEvent("onToastShow", ["id": id])
  }

  func toastDidDismiss(id: String, reason: ToastDismissReason) {
    sendEvent("onToastDismiss", [
      "id": id,
      "reason": reason.rawValue
    ])

    let completion = queue.completeVisibleDismiss(id: id, allowPromotion: !isDismissingAll)

    if let promoted = completion.promoted {
      ToastPresenter.shared.present(promoted)
    }

    if isDismissingAll && !queue.hasVisibleToasts {
      isDismissingAll = false
    }

    syncCollapsedIndicators()
  }

  func toastActionPressed(id: String) {
    sendEvent("onToastActionPress", ["id": id])
  }

  private static func supportsCurrentPlatform() -> Bool {
#if os(iOS)
    ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
#else
    false
#endif
  }

  private func syncCollapsedIndicators() {
    ToastPresenter.shared.updateCollapsedIndicators(
      topPendingCount: queue.pendingTopCount,
      bottomPendingCount: queue.pendingBottomCount
    )
  }

  private static func parse(payload: ToastPayloadRecord) -> ToastPayload {
    let id = payload.id
    let variantRaw = payload.variant
    let variant = ToastVariant(rawValue: variantRaw) ?? .info
    let title = payload.title
    let message = payload.message
    let actionLabel = payload.actionLabel
    let durationMs = Int(payload.durationMs.rounded())
    let positionRaw = payload.position
    let position = ToastPosition(rawValue: positionRaw) ?? .top
    let sizeRaw = payload.size
    let size = ToastSizeMode(rawValue: sizeRaw) ?? .fillWidth
    let haptics = payload.haptics

    return ToastPayload(
      id: id,
      variant: variant,
      title: title,
      message: message,
      actionLabel: actionLabel,
      durationMs: durationMs,
      position: position,
      size: size,
      haptics: haptics
    )
  }

  private static func mergeTransition(
    current: ToastPayload,
    transition: ToastTransitionRecord
  ) -> ToastPayload {
    let nextVariant = transition.variant.flatMap(ToastVariant.init(rawValue:)) ?? current.variant
    let nextTitle: String?
    if transition.clearTitle == true {
      nextTitle = nil
    } else {
      nextTitle = transition.title ?? current.title
    }

    let nextActionLabel: String?
    if transition.clearAction == true {
      nextActionLabel = nil
    } else {
      nextActionLabel = transition.actionLabel ?? current.actionLabel
    }

    let nextDurationMs: Int
    if let durationMs = transition.durationMs {
      nextDurationMs = Int(durationMs.rounded())
    } else {
      nextDurationMs = current.durationMs
    }

    let nextSize = transition.size.flatMap(ToastSizeMode.init(rawValue:)) ?? current.size
    let nextHaptics = transition.haptics ?? current.haptics

    return ToastPayload(
      id: current.id,
      variant: nextVariant,
      title: nextTitle,
      message: transition.message ?? current.message,
      actionLabel: nextActionLabel,
      durationMs: nextDurationMs,
      position: current.position,
      size: nextSize,
      haptics: nextHaptics
    )
  }
}
