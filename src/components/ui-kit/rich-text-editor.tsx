"use client";

import * as React from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Unlink,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here...",
  readOnly = false,
  className,
}: RichTextEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        allowBase64: true,
      }),
    ],
    editable: !readOnly,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-28 rounded-b-md border border-t-0 bg-background px-3 py-2 text-sm focus:outline-none [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:my-2 [&_img]:max-h-60 [&_img]:w-auto [&_img]:max-w-full [&_p]:my-1",
      },
      handlePaste: (_view, event) => {
        const clipboardItems = event.clipboardData?.items;
        if (!clipboardItems?.length) {
          return false;
        }

        const imageItem = Array.from(clipboardItems).find((item) => item.type.startsWith("image/"));
        if (!imageItem) {
          return false;
        }

        const file = imageItem.getAsFile();
        if (!file) {
          return false;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const imageSrc = String(reader.result ?? "");
          if (imageSrc) {
            editor?.chain().focus().setImage({ src: imageSrc, alt: "Pasted image" }).run();
          }
        };
        reader.onerror = () => {
          toast.error("Failed to paste image.");
        };
        reader.readAsDataURL(file);

        return true;
      },
    },
    onUpdate: ({ editor: tiptapEditor }) => {
      onChange(tiptapEditor.getHTML());
    },
  });

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  const handleInsertLink = () => {
    if (!editor) {
      return;
    }

    const currentHref = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter link URL", currentHref ?? "https://");

    if (url === null) {
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmedUrl }).run();
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageSrc = String(reader.result ?? "");
      if (imageSrc) {
        editor.chain().focus().setImage({ src: imageSrc, alt: file.name }).run();
      }
      event.target.value = "";
    };
    reader.onerror = () => {
      toast.error("Failed to attach image.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("w-full", className)}>
      {!readOnly ? (
        <div className="flex flex-wrap gap-1 rounded-t-md border bg-muted/30 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 px-2", editor.isActive("bold") && "bg-muted")}
          >
            <Bold className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-8 px-2", editor.isActive("italic") && "bg-muted")}
          >
            <Italic className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("h-8 px-2", editor.isActive("bulletList") && "bg-muted")}
          >
            <List className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("h-8 px-2", editor.isActive("orderedList") && "bg-muted")}
          >
            <ListOrdered className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn("h-8 px-2", editor.isActive("codeBlock") && "bg-muted")}
          >
            <Code2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleInsertLink}
            className={cn("h-8 px-2", editor.isActive("link") && "bg-muted")}
          >
            <Link2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="h-8 px-2"
          >
            <Unlink className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleImagePick} className="h-8 px-2">
            <ImagePlus className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            className="h-8 px-2"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            className="h-8 px-2"
          >
            <Redo2 className="size-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      ) : null}
      <div className={cn(readOnly ? "rounded-md border bg-muted/20" : "")}>
        <EditorContent editor={editor} />
        {!value && (
          <p className="pointer-events-none mt-[-2.1rem] px-3 text-sm text-muted-foreground">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
