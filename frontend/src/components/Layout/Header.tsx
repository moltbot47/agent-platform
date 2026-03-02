interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="mb-6">
      <h2 className="text-lg font-semibold text-[#e6edf3]">{title}</h2>
      {subtitle && <p className="text-sm text-[#7d8590] mt-0.5">{subtitle}</p>}
    </header>
  )
}
