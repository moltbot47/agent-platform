interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="mb-8">
      <h2 className="text-xl font-semibold text-[#EEEEEE]">{title}</h2>
      {subtitle && <p className="text-sm text-[#9B9EA3] mt-1">{subtitle}</p>}
    </header>
  )
}
