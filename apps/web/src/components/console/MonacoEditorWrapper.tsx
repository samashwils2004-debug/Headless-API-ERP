"use client";

import Editor, { loader, type EditorProps } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Use the locally installed monaco-editor bundle instead of the CDN default.
// This runs once at module evaluation time (safe here because this file is
// only ever loaded via dynamic({ ssr: false }), so it never runs on the server).
loader.config({ monaco });

export default function MonacoEditorWrapper(props: EditorProps) {
  return <Editor {...props} />;
}
