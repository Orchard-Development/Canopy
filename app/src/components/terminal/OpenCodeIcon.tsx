import { SvgIcon, type SxProps, type Theme } from "@mui/material";

interface Props { sx?: SxProps<Theme> }

export function OpenCodeIcon({ sx }: Props) {
  return (
    <SvgIcon
      viewBox="0 0 512 512"
      sx={{
        width: 22, height: 22,
        display: "inline-block", verticalAlign: "middle",
        ...((sx ?? {}) as Record<string, unknown>),
      }}
    >
      <rect width="512" height="512" fill="#131010" rx="64" />
      <path d="M320 224V352H192V224H320Z" fill="#5A5858" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M384 416H128V96H384V416ZM320 160H192V352H320V160Z"
        fill="white"
      />
    </SvgIcon>
  );
}
