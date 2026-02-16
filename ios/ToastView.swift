import SwiftUI
import UIKit

final class ToastView: UIView {
  var actionTapHandler: (() -> Void)?

  private var hostingController: UIHostingController<AnyView>?

  override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }

  required init?(coder: NSCoder) {
    return nil
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let radius = bounds.height * 0.5
    layer.cornerRadius = radius
    layer.cornerCurve = .continuous
    layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: radius).cgPath
  }

  private func setup() {
    backgroundColor = .clear
    clipsToBounds = false

    layer.shadowColor = UIColor.black.cgColor
    layer.shadowOpacity = traitCollection.userInterfaceStyle == .dark ? 0.22 : 0.09
    layer.shadowRadius = 20
    layer.shadowOffset = CGSize(width: 0, height: 8)

    let controller = UIHostingController(rootView: AnyView(EmptyView()))
    controller.view.backgroundColor = .clear
    controller.view.translatesAutoresizingMaskIntoConstraints = false

    addSubview(controller.view)
    NSLayoutConstraint.activate([
      controller.view.topAnchor.constraint(equalTo: topAnchor),
      controller.view.bottomAnchor.constraint(equalTo: bottomAnchor),
      controller.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      controller.view.trailingAnchor.constraint(equalTo: trailingAnchor)
    ])

    hostingController = controller
  }

  func configure(with payload: ToastPayload) {
    let model = ToastGlassModel(payload: payload)

    if #available(iOS 26.0, *) {
      hostingController?.rootView = AnyView(
        ToastGlassSurface(model: model) { [weak self] in
          let tapFeedback = UIImpactFeedbackGenerator(style: .soft)
          tapFeedback.impactOccurred()
          self?.actionTapHandler?()
        }
      )
    } else {
      hostingController?.rootView = AnyView(
        ToastFallbackSurface(model: model) { [weak self] in
          self?.actionTapHandler?()
        }
      )
    }

    accessibilityLabel = [payload.title, payload.message].compactMap { $0 }.joined(separator: ". ")
    isAccessibilityElement = true
  }

  func transition(to payload: ToastPayload) {
    layoutIfNeeded()
    let previousSnapshot = hostingController?.view.snapshotView(afterScreenUpdates: true)
    configure(with: payload)
    layoutIfNeeded()

    guard let contentView = hostingController?.view else {
      return
    }

    if let previousSnapshot {
      previousSnapshot.frame = bounds
      previousSnapshot.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      addSubview(previousSnapshot)
      bringSubviewToFront(previousSnapshot)
    }

    contentView.alpha = 0
    contentView.transform = CGAffineTransform(scaleX: 0.965, y: 0.965)
    previousSnapshot?.alpha = 1
    previousSnapshot?.transform = .identity

    // Two-stage morph: soften the swap first, then spring-settle.
    UIView.animate(withDuration: 0.14, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
      contentView.alpha = 0.52
      contentView.transform = CGAffineTransform(scaleX: 0.985, y: 0.985)
      previousSnapshot?.alpha = 0.55
      previousSnapshot?.transform = CGAffineTransform(scaleX: 1.015, y: 1.015)
    } completion: { _ in
      UIView.animate(
        withDuration: 0.3,
        delay: 0,
        usingSpringWithDamping: 0.86,
        initialSpringVelocity: 0.15,
        options: [.curveEaseOut, .allowUserInteraction]
      ) {
        contentView.alpha = 1
        contentView.transform = .identity
        previousSnapshot?.alpha = 0
        previousSnapshot?.transform = CGAffineTransform(scaleX: 1.03, y: 1.03)
      } completion: { _ in
        previousSnapshot?.removeFromSuperview()
      }
    }
  }
}

private struct ToastGlassModel {
  let variant: ToastVariant
  let title: String?
  let message: String
  let symbolName: String?
  let actionLabel: String?
  let actionTextColor: Color
  let actionTintColor: Color

  init(payload: ToastPayload) {
    variant = payload.variant
    title = payload.title
    message = payload.message
    actionLabel = payload.actionLabel

    switch payload.variant {
    case .success:
      symbolName = "checkmark.circle"
      actionTextColor = .primary
      actionTintColor = .primary
    case .error:
      symbolName = "xmark.circle"
      actionTextColor = .white
      actionTintColor = .red
    case .info:
      symbolName = "info.circle"
      actionTextColor = .primary
      actionTintColor = .primary
    case .loading:
      symbolName = "clock.arrow.trianglehead.counterclockwise.rotate.90"
      actionTextColor = .primary
      actionTintColor = .primary
    }
  }
}

@available(iOS 26.0, *)
private struct ToastGlassSurface: View {
  let model: ToastGlassModel
  let onActionTap: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      if model.variant == .loading {
        LoadingDotsView()
          .frame(width: 20, height: 20)
      } else if let symbolName = model.symbolName {
        Image(systemName: symbolName)
          .font(.system(size: 19, weight: .medium))
          .frame(width: 20, height: 20)
          .foregroundStyle(.primary)
      } else {
        Color.clear.frame(width: 14, height: 20)
      }

      VStack(alignment: .leading, spacing: 1) {
        if let title = model.title, !title.isEmpty {
          Text(title)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .truncationMode(.tail)
            .foregroundStyle(.primary)
        }

        Text(model.message)
          .font(.subheadline.weight(.medium))
          .lineLimit(1)
          .truncationMode(.tail)
          .foregroundStyle(.secondary)
      }
      .layoutPriority(1)
      .frame(maxWidth: .infinity, alignment: .leading)

      if let actionLabel = model.actionLabel, !actionLabel.isEmpty {
        Button(action: onActionTap) {
          Text(actionLabel)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
        .foregroundStyle(model.actionTextColor)
        .fixedSize(horizontal: true, vertical: false)
        .glassEffect(.regular.tint(model.actionTintColor).interactive(), in: .capsule)
        .accessibilityLabel(actionLabel)
      } else {
        Color.clear.frame(width: 14, height: 1)
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .glassEffect(.regular, in: .capsule)
  }
}

private struct ToastFallbackSurface: View {
  let model: ToastGlassModel
  let onActionTap: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      if model.variant == .loading {
        LoadingDotsView()
          .frame(width: 20, height: 20)
      } else if let symbolName = model.symbolName {
        Image(systemName: symbolName)
          .font(.system(size: 19, weight: .medium))
          .frame(width: 20, height: 20)
          .foregroundStyle(.primary)
      }

      VStack(alignment: .leading, spacing: 2) {
        if let title = model.title, !title.isEmpty {
          Text(title)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .truncationMode(.tail)
        }

        Text(model.message)
          .font(.subheadline.weight(.medium))
          .lineLimit(1)
          .truncationMode(.tail)
          .foregroundStyle(.secondary)
      }
      .layoutPriority(1)
      .frame(maxWidth: .infinity, alignment: .leading)

      if let actionLabel = model.actionLabel, !actionLabel.isEmpty {
        Button(actionLabel, action: onActionTap)
          .font(.subheadline.weight(.semibold))
          .buttonStyle(.plain)
          .padding(.horizontal, 14)
          .padding(.vertical, 8)
          .background(model.actionTintColor.opacity(0.22), in: Capsule())
          .foregroundStyle(model.actionTextColor)
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .background(.ultraThinMaterial, in: Capsule())
  }
}

private struct LoadingDotsView: View {
  @State private var isAnimating = false

  var body: some View {
    HStack(spacing: 2.5) {
      dot(index: 0)
      dot(index: 1)
      dot(index: 2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .onAppear {
      withAnimation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true)) {
        isAnimating = true
      }
    }
  }

  @ViewBuilder
  private func dot(index: Int) -> some View {
    Circle()
      .fill(Color.primary.opacity(0.9))
      .frame(width: 4.2, height: 4.2)
      .scaleEffect(isAnimating ? 1.0 : 0.55, anchor: .center)
      .opacity(isAnimating ? 1.0 : 0.45)
      .animation(
        .easeInOut(duration: 0.55)
          .repeatForever(autoreverses: true)
          .delay(Double(index) * 0.12),
        value: isAnimating
      )
  }
}
