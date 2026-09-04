'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, FileText, Paperclip, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imageProps } from '@/lib/images';
import { cn } from '@/lib/utils';

/**
 * Attachments for a sourcing request.
 *
 * Most of these arrive as a phone photo of a nameplate taken next to a failed
 * breaker, so the camera button is a peer of the file picker rather than
 * hidden behind it — `capture="environment"` opens the rear camera directly
 * instead of the gallery.
 *
 * Drag-and-drop is the desktop path and is deliberately secondary: on a
 * touch screen a drop zone is dead space.
 *
 * Validation here is a courtesy — the server checks the actual bytes, because
 * an extension and a MIME type are both trivially forged. What this catches is
 * the honest mistake, immediately, rather than after an upload.
 */

export const MAX_FILES = 5;
export const MAX_BYTES = 10 * 1024 * 1024;

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.dwg,.xlsx,.xls,image/*,application/pdf';

export interface PickedFile {
  id: string;
  file: File;
  /** Object URL for images only; revoked on removal to avoid leaking blobs. */
  preview?: string;
}

function describe(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (file: File): boolean => file.type.startsWith('image/');

export function AttachmentPicker({
  files,
  onChange,
}: {
  files: PickedFile[];
  onChange: (next: PickedFile[]) => void;
}): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // Object URLs are not garbage collected; without this every re-pick leaks.
  useEffect(
    () => () => {
      files.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
    [],
  );

  const accept = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      setError(null);

      const room = MAX_FILES - files.length;
      if (room <= 0) {
        setError(`That is the limit — ${MAX_FILES} files. Remove one to add another.`);
        return;
      }

      const list = Array.from(incoming);
      const tooBig = list.filter((file) => file.size > MAX_BYTES);
      const usable = list.filter((file) => file.size <= MAX_BYTES).slice(0, room);

      if (tooBig.length > 0) {
        setError(
          `${tooBig.map((f) => f.name).join(', ')} — over 10 MB. Try photographing the nameplate rather than sending the full catalogue.`,
        );
      } else if (list.length > room) {
        setError(`Only the first ${room} were added — ${MAX_FILES} is the limit.`);
      }

      onChange([
        ...files,
        ...usable.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          ...(isImage(file) ? { preview: URL.createObjectURL(file) } : {}),
        })),
      ]);
    },
    [files, onChange],
  );

  const remove = (id: string): void => {
    const target = files.find((item) => item.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    onChange(files.filter((item) => item.id !== id));
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
        className={cn(
          'rounded-lg border-2 border-dashed p-5 text-center transition-colors',
          dragging ? 'border-brand-cyan bg-brand-cyan/5' : 'border-border bg-surface',
        )}
      >
        <Paperclip className="mx-auto size-6 text-brand-cyan" aria-hidden />
        <p className="mt-2 text-sm font-medium text-brand-navy">
          Upload a datasheet, drawing, or a photo of the old part&apos;s nameplate.
        </p>
        <p className="mt-1 text-2xs text-muted-foreground">
          PDF, JPG, PNG, DWG or XLSX · up to {MAX_FILES} files · 10 MB each
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {/* Camera first on mobile: it is how most of these actually arrive. */}
          <Button
            type="button"
            variant="cta"
            size="sm"
            onClick={() => cameraInput.current?.click()}
            className="sm:hidden"
          >
            <Camera />
            Take a photo
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Upload />
            Choose files
          </Button>
        </div>

        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files);
            // Reset so picking the same file twice still fires onChange.
            event.target.value = '';
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p role="status" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((item) => (
            <li
              key={item.id}
              className="relative overflow-hidden rounded-lg border border-border bg-white"
            >
              <div className="relative flex h-24 items-center justify-center bg-surface">
                {item.preview ? (
                  <Image
                    {...imageProps(item.preview)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <FileText className="size-7 text-brand-navy/40" aria-hidden />
                )}
              </div>

              <div className="p-2">
                <p className="truncate text-2xs font-medium text-foreground" title={item.file.name}>
                  {item.file.name}
                </p>
                <p className="text-2xs text-muted-foreground">{describe(item.file.size)}</p>
              </div>

              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.file.name}`}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-brand-navy/80 text-white transition-colors hover:bg-destructive"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
