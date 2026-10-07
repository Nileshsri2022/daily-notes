import RenderHTML from "react-native-render-html";
import { useWindowDimensions } from "react-native";

import { colors, fonts, spacing, type } from "@/constants/theme";

/** HTML renderer (for rich-text notes). */
export function HtmlView({ html }: { html: string }) {
  const { width } = useWindowDimensions();
  return (
    <RenderHTML
      contentWidth={width}
      source={{ html }}
      tagsStyles={{
        p: { ...type.bodyLg, color: colors.body, marginBottom: spacing.sm },
        h1: { ...type.displayLg, color: colors.ink },
        h2: { ...type.displayMd, color: colors.ink },
        h3: { ...type.displaySm, color: colors.ink },
        strong: { color: colors.ink },
        a: { color: colors.primary },
        code: {
          fontFamily: fonts.mono,
          fontSize: 15,
          color: colors.primary,
          backgroundColor: colors.surfaceCard,
        },
        pre: {
          fontFamily: fonts.mono,
          fontSize: 14,
          color: colors.body,
          backgroundColor: colors.surfaceCard,
          borderRadius: 12,
          padding: 12,
        },
        li: { ...type.bodyLg, color: colors.body },
        blockquote: {
          borderLeftWidth: 2,
          borderLeftColor: colors.primary,
          paddingLeft: spacing.sm,
        },
      }}
    />
  );
}
