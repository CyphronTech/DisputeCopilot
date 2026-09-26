export function Icon({ name }: { name: string }) {
  return (
    <svg>
      <use href={`/icons.svg#i-${name}`} />
    </svg>
  )
}
