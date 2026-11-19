export function SoundIcon({ id }: { id: string }) {
  const name = id.startsWith('rec:') ? 'mic' : id
  return (
    <img
      className="sound-icon"
      alt=""
      draggable={false}
      src={`${import.meta.env.BASE_URL}emoji/${name}.svg`}
    />
  )
}
