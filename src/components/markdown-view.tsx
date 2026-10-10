import Markdown from "react-native-markdown-display";
import { View } from "react-native";
import { markdownStyles, styles } from "@/styles/markdown-view.styles";

/** Markdown renderer. */
export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <View style={styles.container}>
      <Markdown style={markdownStyles}>{markdown}</Markdown>
    </View>
  );
}
