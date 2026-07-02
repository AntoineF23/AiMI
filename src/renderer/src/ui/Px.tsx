/** A pixel-art icon from /px, rendered crisp at any multiple of 16. */
export function Px({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return <img src={`./px/${name}.png`} width={size} height={size} className={`px ${className ?? ''}`} alt={name} draggable={false} />
}
