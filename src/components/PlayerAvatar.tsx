export function PlayerAvatar({
  nick,
  hue,
  avatarUrl,
  size = 40,
  online,
}: {
  nick: string;
  hue: number;
  avatarUrl?: string;
  size?: number;
  online?: boolean;
}) {
  const letter = nick.slice(0, 1).toUpperCase();
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-2xl object-cover"
        />
      ) : (
        <span
        className="grid h-full w-full place-items-center rounded-2xl text-sm font-bold text-ink-950"
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 80% 62%), hsl(${(hue + 40) % 360} 70% 42%))`,
          fontSize: size * 0.38,
        }}
      >
        {letter}
        </span>
      )}
      {typeof online === "boolean" ? (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-ink-900 ${online ? "bg-accent animate-pulseDot" : "bg-zinc-500"}`}
        />
      ) : null}
    </span>
  );
}
