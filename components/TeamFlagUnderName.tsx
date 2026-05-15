type Props = {
  teamName: string;
  countryCode?: string;
  size?: number;
  teamNameStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  flagStyle?: React.CSSProperties;
};

export default function TeamFlagUnderName({
  teamName,
  countryCode,
  size = 40,
  teamNameStyle,
  wrapperStyle,
  flagStyle,
}: Props) {
  if (!countryCode) return null;

  const code = countryCode.toLowerCase();

  return (
    <div
      style={{
        textAlign: "center",
        ...wrapperStyle,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          margin: "0 auto",
          borderRadius: "50%",
          background: "#0F172A",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={`/flags/${code}.png`}
          alt={teamName}
          width={size}
          height={size}
          style={{
            width: "78%",
            height: "78%",
            objectFit: "contain",
            display: "block",
            ...flagStyle,
          }}
        />
      </div>

      <div
        style={{
          marginTop: "0.42rem",
          fontSize: "0.9rem",
          lineHeight: 1.2,
          color: "#FFFFFF",
          fontWeight: 600,
          ...teamNameStyle,
        }}
      >
        {teamName}
      </div>
    </div>
  );
}