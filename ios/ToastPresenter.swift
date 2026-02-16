import UIKit

protocol ToastPresenterDelegate: AnyObject {
  func toastDidShow(id: String)
  func toastDidDismiss(id: String, reason: ToastDismissReason)
  func toastActionPressed(id: String)
}

private final class ToastPassthroughWindow: UIWindow {
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard let hitView = super.hitTest(point, with: event) else {
      return nil
    }

    if hitView === self || hitView === rootViewController?.view {
      return nil
    }

    var current: UIView? = hitView
    while let view = current {
      if view is ToastView {
        return hitView
      }
      current = view.superview
    }

    return nil
  }
}

private final class ToastPanGestureRecognizer: UIPanGestureRecognizer {
  var toastId: String = ""
}

final class ToastPresenter: NSObject {
  static let shared = ToastPresenter()
  private struct ReflowShift {
    let view: UIView
    let baselineTransform: CGAffineTransform
  }

  weak var delegate: ToastPresenterDelegate?

  private var overlayWindow: ToastPassthroughWindow?
  private weak var overlayRootView: UIView?
  private weak var topStackView: UIStackView?
  private weak var bottomStackView: UIStackView?
  private var bottomStackBottomConstraint: NSLayoutConstraint?
  private var topCollapsedView: ToastView?
  private var bottomCollapsedView: ToastView?
  private var keyboardObserverTokens: [NSObjectProtocol] = []

  private var toastViewsById: [String: ToastView] = [:]
  private var payloadsById: [String: ToastPayload] = [:]
  private var dismissTimersById: [String: Timer] = [:]

  private override init() {
    super.init()
  }

  func present(_ insertion: ToastInsertion) {
    let payload = insertion.payload

    guard toastViewsById[payload.id] == nil else {
      return
    }

    let window = ensureOverlayWindow()
    window.windowLevel = windowLevel(for: payload.importance)
    guard let root = window.rootViewController?.view,
          let topStack = topStackView,
          let bottomStack = bottomStackView else {
      return
    }

    let toast = ToastView(frame: .zero)
    toast.configure(with: payload)
    toast.translatesAutoresizingMaskIntoConstraints = false
    toast.alpha = 0

    let initialYOffset: CGFloat = payload.position == .top ? -8 : 8
    toast.transform = CGAffineTransform(translationX: 0, y: initialYOffset).scaledBy(x: 0.95, y: 0.95)

    toast.actionTapHandler = { [weak self] in
      guard let self else { return }
      self.delegate?.toastActionPressed(id: payload.id)
      self.dismiss(id: payload.id, reason: .programmatic)
    }

    let pan = ToastPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
    pan.toastId = payload.id
    toast.addGestureRecognizer(pan)

    toastViewsById[payload.id] = toast
    payloadsById[payload.id] = payload

    let stack = payload.position == .top ? topStack : bottomStack
    let reflowStartFrames = captureStackFrames(in: stack, root: root)
    insert(toast: toast, into: stack, position: payload.position, placement: insertion.placement)
    let reflowShifts = prepareReflowShifts(in: stack, root: root, from: reflowStartFrames, excluding: toast)

    let maxWidth = toast.widthAnchor.constraint(lessThanOrEqualToConstant: 560)
    let fillWidth = toast.widthAnchor.constraint(equalTo: root.widthAnchor, multiplier: 0.92)
    fillWidth.priority = .required

    NSLayoutConstraint.activate([
      toast.widthAnchor.constraint(greaterThanOrEqualToConstant: 240),
      toast.widthAnchor.constraint(lessThanOrEqualTo: root.widthAnchor, multiplier: 0.92),
    ])

    if payload.size == .fitContent {
      maxWidth.priority = .required
      maxWidth.isActive = true
      toast.setContentHuggingPriority(.required, for: .horizontal)
      toast.setContentCompressionResistancePriority(.required, for: .horizontal)
    } else {
      // Fill width should feel deterministic on phone-sized layouts.
      maxWidth.priority = .defaultHigh
      maxWidth.isActive = true
      fillWidth.isActive = true
      toast.setContentHuggingPriority(.defaultLow, for: .horizontal)
      toast.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    }

    if payload.announce {
      UIAccessibility.post(notification: .announcement, argument: toast.accessibilityLabel)
    }

    if payload.haptics {
      playHaptic(for: payload.variant)
    }

    // Ensure initial frame is resolved before animating transform/alpha.
    root.layoutIfNeeded()

    if payload.reducedMotion {
      UIView.animate(withDuration: 0.16,
                     delay: 0,
                     options: [.curveEaseOut, .allowUserInteraction]) {
        toast.alpha = 1
        toast.transform = .identity
        for shift in reflowShifts {
          shift.view.transform = shift.baselineTransform
        }
        root.layoutIfNeeded()
      } completion: { [weak self] _ in
        self?.delegate?.toastDidShow(id: payload.id)
        self?.scheduleDismissIfNeeded(for: payload)
      }
    } else {
      UIView.animate(withDuration: 0.42,
                     delay: 0,
                     usingSpringWithDamping: 0.76,
                     initialSpringVelocity: 0.4,
                     options: [.curveEaseOut, .allowUserInteraction]) {
        toast.alpha = 1
        toast.transform = .identity
        for shift in reflowShifts {
          shift.view.transform = shift.baselineTransform
        }
        root.layoutIfNeeded()
      } completion: { [weak self] _ in
        self?.delegate?.toastDidShow(id: payload.id)
        self?.scheduleDismissIfNeeded(for: payload)
      }
    }
  }

  func transition(id: String, to payload: ToastPayload) {
    guard let toast = toastViewsById[id], payloadsById[id] != nil else {
      return
    }

    dismissTimersById[id]?.invalidate()
    dismissTimersById[id] = nil

    payloadsById[id] = payload
    toast.transition(to: payload)
    toast.transform = .identity
    toast.alpha = 1

    if payload.haptics {
      playHaptic(for: payload.variant)
    }

    if payload.announce {
      UIAccessibility.post(notification: .announcement, argument: toast.accessibilityLabel)
    }
    scheduleDismissIfNeeded(for: payload)
  }

  func dismiss(id: String, reason: ToastDismissReason, swipeVelocityY: CGFloat? = nil) {
    dismissTimersById[id]?.invalidate()
    dismissTimersById[id] = nil

    guard let toast = toastViewsById[id], let payload = payloadsById[id] else {
      return
    }

    let animationDuration: TimeInterval
    let targetTransform: CGAffineTransform

    if payload.reducedMotion {
      targetTransform = .identity
      animationDuration = 0.14
    } else if let swipeVelocityY {
      let currentY = toast.transform.ty
      let direction: CGFloat = currentY == 0
        ? (payload.position == .top ? -1 : 1)
        : (currentY < 0 ? -1 : 1)
      let offscreenDistance = max(overlayRootView?.bounds.height ?? 420, 260)
      let finalY = currentY + direction * offscreenDistance
      targetTransform = CGAffineTransform(translationX: 0, y: finalY).scaledBy(x: 0.9, y: 0.9)

      // Faster fling for high-velocity swipes.
      let velocityScale = min(max(abs(swipeVelocityY) / 1800, 0), 1)
      animationDuration = 0.22 - (0.1 * velocityScale)
    } else {
      let exitYOffset: CGFloat = payload.position == .top ? -18 : 18
      targetTransform = CGAffineTransform(translationX: 0, y: exitYOffset).scaledBy(x: 0.96, y: 0.96)
      animationDuration = 0.2
    }

    let stackReflowShifts: [ReflowShift]
    if let root = overlayRootView, let stack = toast.superview as? UIStackView {
      let reflowStartFrames = captureStackFrames(in: stack, root: root)
      detachForIndependentAnimation(view: toast)
      stackReflowShifts = prepareReflowShifts(in: stack, root: root, from: reflowStartFrames, excluding: nil)
    } else {
      detachForIndependentAnimation(view: toast)
      stackReflowShifts = []
    }

    UIView.animate(withDuration: animationDuration, delay: 0, options: [.curveEaseIn]) {
      toast.alpha = 0
      toast.transform = targetTransform
      for shift in stackReflowShifts {
        shift.view.transform = shift.baselineTransform
      }
      self.overlayRootView?.layoutIfNeeded()
    } completion: { [weak self] _ in
      guard let self else { return }

      self.toastViewsById[id] = nil
      self.payloadsById[id] = nil

      toast.removeFromSuperview()

      self.delegate?.toastDidDismiss(id: id, reason: reason)
      self.teardownWindowIfNeeded()
    }
  }

  @objc
  private func handlePan(_ gesture: ToastPanGestureRecognizer) {
    guard let toast = toastViewsById[gesture.toastId],
          let payload = payloadsById[gesture.toastId] else {
      return
    }

    let translation = gesture.translation(in: toast)
    let velocity = gesture.velocity(in: toast)
    let isTopToast = payload.position == .top

    switch gesture.state {
    case .changed:
      let y = isTopToast ? min(0, translation.y) : max(0, translation.y)
      let distance = abs(y)
      let scale = max(0.92, 1 - distance / 600)
      toast.transform = CGAffineTransform(translationX: 0, y: y).scaledBy(x: scale, y: scale)
      toast.alpha = max(0.6, 1 - distance / 240)
    case .ended:
      let shouldDismiss = isTopToast
        ? (translation.y < -22 || velocity.y < -420)
        : (translation.y > 22 || velocity.y > 420)

      if shouldDismiss {
        dismiss(id: gesture.toastId, reason: .swipe, swipeVelocityY: velocity.y)
      } else {
        UIView.animate(withDuration: 0.2, delay: 0, options: [.curveEaseOut]) {
          toast.transform = .identity
          toast.alpha = 1
        }
      }
    default:
      break
    }
  }

  private func insert(
    toast: ToastView,
    into stack: UIStackView,
    position: ToastPosition,
    placement: ToastInsertionPlacement
  ) {
    switch (position, placement) {
    case (.top, .nearEdge):
      stack.insertArrangedSubview(toast, at: 0)
    case (.top, .farEdge):
      stack.addArrangedSubview(toast)
    case (.bottom, .nearEdge):
      stack.addArrangedSubview(toast)
    case (.bottom, .farEdge):
      stack.insertArrangedSubview(toast, at: 0)
    }
  }

  private func ensureOverlayWindow() -> ToastPassthroughWindow {
    if let overlayWindow {
      return overlayWindow
    }

    let window: ToastPassthroughWindow
    let foregroundScene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }

    if let scene = foregroundScene {
      window = ToastPassthroughWindow(windowScene: scene)
    } else {
      window = ToastPassthroughWindow(frame: UIScreen.main.bounds)
    }

    let controller = UIViewController()
    controller.view.backgroundColor = .clear
    controller.view.isUserInteractionEnabled = true
    window.rootViewController = controller
    window.windowLevel = .alert + 1
    window.backgroundColor = .clear
    window.isHidden = false

    let topStack = UIStackView()
    topStack.axis = .vertical
    topStack.spacing = 8
    topStack.alignment = .center
    topStack.translatesAutoresizingMaskIntoConstraints = false

    let bottomStack = UIStackView()
    bottomStack.axis = .vertical
    bottomStack.spacing = 8
    bottomStack.alignment = .center
    bottomStack.translatesAutoresizingMaskIntoConstraints = false

    controller.view.addSubview(topStack)
    controller.view.addSubview(bottomStack)

    NSLayoutConstraint.activate([
      topStack.topAnchor.constraint(equalTo: controller.view.safeAreaLayoutGuide.topAnchor, constant: 6),
      topStack.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor, constant: 10),
      topStack.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor, constant: -10),
      bottomStack.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor, constant: 10),
      bottomStack.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor, constant: -10),
    ])
    let bottomConstraint = bottomStack.bottomAnchor.constraint(
      equalTo: controller.view.safeAreaLayoutGuide.bottomAnchor,
      constant: -12
    )
    bottomConstraint.isActive = true

    overlayWindow = window
    overlayRootView = controller.view
    topStackView = topStack
    bottomStackView = bottomStack
    bottomStackBottomConstraint = bottomConstraint
    registerKeyboardObservers()
    return window
  }

  private func teardownWindowIfNeeded() {
    guard toastViewsById.isEmpty else {
      return
    }

    dismissTimersById.values.forEach { $0.invalidate() }
    dismissTimersById.removeAll()

    topStackView = nil
    bottomStackView = nil
    bottomStackBottomConstraint = nil
    topCollapsedView = nil
    bottomCollapsedView = nil
    overlayRootView = nil
    unregisterKeyboardObservers()

    overlayWindow?.isHidden = true
    overlayWindow = nil
  }

  private func scheduleDismissIfNeeded(for payload: ToastPayload) {
    guard payload.durationMs >= 0 else {
      return
    }

    let stack = payload.position == .top ? topStackView : bottomStackView
    let staggerMs = stackDepthStaggerMs(for: payload.id, position: payload.position, in: stack)

    dismissTimersById[payload.id]?.invalidate()
    dismissTimersById[payload.id] = Timer.scheduledTimer(
      withTimeInterval: TimeInterval(payload.durationMs + staggerMs) / 1000.0,
      repeats: false
    ) { [weak self] _ in
      self?.dismiss(id: payload.id, reason: .timeout)
    }
  }

  func updateCollapsedIndicators(topPendingCount: Int, bottomPendingCount: Int) {
    guard let root = overlayRootView else {
      return
    }

    updateCollapsedIndicator(
      for: .top,
      pendingCount: topPendingCount,
      stack: topStackView,
      root: root,
      storage: &topCollapsedView
    )

    updateCollapsedIndicator(
      for: .bottom,
      pendingCount: bottomPendingCount,
      stack: bottomStackView,
      root: root,
      storage: &bottomCollapsedView
    )
  }

  private func updateCollapsedIndicator(
    for position: ToastPosition,
    pendingCount: Int,
    stack: UIStackView?,
    root: UIView,
    storage: inout ToastView?
  ) {
    guard let stack else {
      storage = nil
      return
    }

    if pendingCount <= 0 {
      guard let view = storage else { return }
      storage = nil
      detachForIndependentAnimation(view: view)
      UIView.animate(withDuration: 0.18, animations: {
        view.alpha = 0
        root.layoutIfNeeded()
      }) { _ in
        view.removeFromSuperview()
      }
      return
    }

    let message = pendingCount == 1 ? "1 more in queue" : "\(pendingCount) more in queue"
    let payload = ToastPayload(
      id: "collapsed-\(position.rawValue)",
      variant: .info,
      title: nil,
      message: message,
      actionLabel: nil,
      durationMs: -1,
      position: position,
      size: .fillWidth,
      haptics: false,
      accessibilityLabel: nil,
      announce: false,
      importance: .low,
      reducedMotion: true
    )

    let indicator: ToastView
    if let existing = storage {
      indicator = existing
      indicator.configure(with: payload)

      // Keep collapsed indicator pinned to the far edge (away from the screen edge).
      if indicator.superview !== stack {
        if let host = indicator.superview as? UIStackView {
          host.removeArrangedSubview(indicator)
          indicator.removeFromSuperview()
        }
        switch position {
        case .top:
          stack.addArrangedSubview(indicator)
        case .bottom:
          stack.insertArrangedSubview(indicator, at: 0)
        }
      } else {
        switch position {
        case .top:
          if stack.arrangedSubviews.last !== indicator {
            stack.removeArrangedSubview(indicator)
            indicator.removeFromSuperview()
            stack.addArrangedSubview(indicator)
          }
        case .bottom:
          if stack.arrangedSubviews.first !== indicator {
            stack.removeArrangedSubview(indicator)
            indicator.removeFromSuperview()
            stack.insertArrangedSubview(indicator, at: 0)
          }
        }
      }
    } else {
      indicator = ToastView(frame: .zero)
      indicator.configure(with: payload)
      indicator.translatesAutoresizingMaskIntoConstraints = false
      indicator.isUserInteractionEnabled = false
      indicator.alpha = 0
      indicator.transform = CGAffineTransform(scaleX: 0.985, y: 0.985)
      storage = indicator

      switch position {
      case .top:
        stack.addArrangedSubview(indicator)
      case .bottom:
        stack.insertArrangedSubview(indicator, at: 0)
      }

      NSLayoutConstraint.activate([
        indicator.widthAnchor.constraint(greaterThanOrEqualToConstant: 220),
        indicator.widthAnchor.constraint(lessThanOrEqualTo: root.widthAnchor, multiplier: 0.86),
      ])

      UIView.animate(withDuration: 0.22, delay: 0, options: [.curveEaseOut]) {
        indicator.alpha = 0.92
        indicator.transform = .identity
        root.layoutIfNeeded()
      }
    }
  }

  private func stackDepthStaggerMs(for id: String, position: ToastPosition, in stack: UIStackView?) -> Int {
    guard let stack, let targetView = toastViewsById[id] else {
      return 0
    }

    let interactiveViews = stack.arrangedSubviews.filter { $0.isUserInteractionEnabled }
    guard let index = interactiveViews.firstIndex(where: { $0 === targetView }) else {
      return 0
    }

    let depth: Int
    switch position {
    case .top:
      depth = index
    case .bottom:
      depth = max(0, interactiveViews.count - 1 - index)
    }

    return min(depth * 320, 900)
  }

  private func playHaptic(for variant: ToastVariant) {
    let generator = UINotificationFeedbackGenerator()
    switch variant {
    case .success:
      generator.notificationOccurred(.success)
    case .error:
      generator.notificationOccurred(.error)
    case .info, .loading:
      generator.notificationOccurred(.warning)
    }
  }

  private func windowLevel(for importance: ToastImportance) -> UIWindow.Level {
    switch importance {
    case .low:
      return .statusBar
    case .normal:
      return .alert + 1
    case .high:
      return .alert + 2
    }
  }

  private func detachForIndependentAnimation(view: UIView) {
    guard let root = overlayRootView,
          let superview = view.superview else {
      return
    }

    if let stack = superview as? UIStackView {
      stack.removeArrangedSubview(view)
    }

    let absoluteFrame = root.convert(view.frame, from: superview)
    view.removeFromSuperview()
    view.translatesAutoresizingMaskIntoConstraints = true
    view.frame = absoluteFrame
    root.addSubview(view)
  }

  private func captureStackFrames(in stack: UIStackView, root: UIView) -> [ObjectIdentifier: CGRect] {
    root.layoutIfNeeded()
    var frames: [ObjectIdentifier: CGRect] = [:]
    for view in stack.arrangedSubviews where view.isUserInteractionEnabled {
      frames[ObjectIdentifier(view)] = root.convert(view.frame, from: stack)
    }
    return frames
  }

  private func prepareReflowShifts(
    in stack: UIStackView,
    root: UIView,
    from startFrames: [ObjectIdentifier: CGRect],
    excluding excludedView: UIView?
  ) -> [ReflowShift] {
    root.layoutIfNeeded()
    var shifts: [ReflowShift] = []

    for view in stack.arrangedSubviews where view.isUserInteractionEnabled {
      if let excludedView, view === excludedView {
        continue
      }

      let identifier = ObjectIdentifier(view)
      guard let startFrame = startFrames[identifier] else {
        continue
      }
      let endFrame = root.convert(view.frame, from: stack)
      let deltaY = startFrame.minY - endFrame.minY

      guard abs(deltaY) > 0.5 else {
        continue
      }

      let baselineTransform = view.transform
      view.transform = baselineTransform.translatedBy(x: 0, y: deltaY)
      shifts.append(ReflowShift(view: view, baselineTransform: baselineTransform))
    }

    return shifts
  }

  private func registerKeyboardObservers() {
    guard keyboardObserverTokens.isEmpty else {
      return
    }

    let center = NotificationCenter.default
    let willChange = center.addObserver(
      forName: UIResponder.keyboardWillChangeFrameNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.handleKeyboard(notification: notification)
    }

    let willHide = center.addObserver(
      forName: UIResponder.keyboardWillHideNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.handleKeyboard(notification: notification)
    }

    keyboardObserverTokens = [willChange, willHide]
  }

  private func unregisterKeyboardObservers() {
    guard !keyboardObserverTokens.isEmpty else {
      return
    }

    let center = NotificationCenter.default
    for token in keyboardObserverTokens {
      center.removeObserver(token)
    }
    keyboardObserverTokens.removeAll()
  }

  private func handleKeyboard(notification: Notification) {
    guard let root = overlayRootView,
          let bottomConstraint = bottomStackBottomConstraint else {
      return
    }

    let userInfo = notification.userInfo ?? [:]
    let keyboardFrame = (userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect) ?? .zero
    let duration = (userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0.25
    let curveRaw = (userInfo[UIResponder.keyboardAnimationCurveUserInfoKey] as? NSNumber)?.intValue
      ?? UIView.AnimationCurve.easeInOut.rawValue
    let animationCurve = UIView.AnimationCurve(rawValue: curveRaw) ?? .easeInOut
    let curveOption: UIView.AnimationOptions
    switch animationCurve {
    case .easeIn:
      curveOption = .curveEaseIn
    case .easeOut:
      curveOption = .curveEaseOut
    case .linear:
      curveOption = .curveLinear
    case .easeInOut:
      curveOption = .curveEaseInOut
    @unknown default:
      curveOption = .curveEaseInOut
    }

    let keyboardFrameInRoot = root.convert(keyboardFrame, from: nil)
    let overlap = max(0, root.bounds.maxY - keyboardFrameInRoot.minY)
    let extraLift = max(0, overlap - root.safeAreaInsets.bottom)
    let nextConstant = -12 - extraLift

    guard abs(bottomConstraint.constant - nextConstant) > 0.5 else {
      return
    }

    bottomConstraint.constant = nextConstant

    UIView.animate(withDuration: duration, delay: 0, options: [curveOption, .allowUserInteraction]) {
      root.layoutIfNeeded()
    }
  }
}
