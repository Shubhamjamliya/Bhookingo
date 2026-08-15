import React from "react"

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ")
}

export default function BhookingoWordmark({
  logoSrc = "/bhookingo-logo.png",
  companyName = "Bhookingo",
  alt,
  href,
  onClick,
  accentClassName = "text-[#E0332F]",
  wrapperClassName = "",
  textClassName = "text-2xl font-black tracking-tight text-gray-900 leading-none",
  logoClassName = "w-14 h-14 object-contain rounded-xl",
  gapClassName = "gap-2.5",
  showText = true,
}) {
  const safeName = companyName || "Bhookingo"
  const content = (
    <>
      <img
        src={logoSrc}
        alt={alt || `${safeName} Logo`}
        className={logoClassName}
      />
      {showText ? (
        <span className={textClassName}>
          <span className={accentClassName}>{safeName.charAt(0)}</span>
          {safeName.slice(1)}
        </span>
      ) : null}
    </>
  )

  const sharedClassName = joinClasses(
    "inline-flex items-center",
    gapClassName,
    wrapperClassName,
  )

  if (href) {
    return (
      <a href={href} onClick={onClick} className={sharedClassName}>
        {content}
      </a>
    )
  }

  return (
    <div onClick={onClick} className={sharedClassName}>
      {content}
    </div>
  )
}
