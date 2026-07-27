'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiClient, unwrap } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Product, ProductImage } from '@/types';

/**
 * Product image manager: drag-and-drop upload, reorder, set primary, delete.
 *
 * Only available once the product exists — uploads post to
 * `/admin/products/:id/images`, so there is no id to attach them to while the
 * create form is still unsaved. The tab says so rather than silently failing.
 */
export function ProductImageManager({ product }: { product?: Product }): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!product) {
    return (
      <Alert variant="info" title="Save the product first">
        Images upload straight to Cloudinary against the product&rsquo;s id, so this tab unlocks once
        you have created the product. Everything else on the form can be filled in now.
      </Alert>
    );
  }

  const upload = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;

    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));

    setUploading(true);
    try {
      const next = unwrap(await apiClient.post<ProductImage[]>(`/admin/products/${product.id}/images`, form));
      setImages(next);
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Check the file type and size (max 5 MB).',
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (publicId: string): Promise<void> => {
    try {
      const next = unwrap(
        await apiClient.delete<ProductImage[]>(
          `/admin/products/${product.id}/images/${encodeURIComponent(publicId)}`,
        ),
      );
      setImages(next);
      toast.success('Image removed');
    } catch (error) {
      toast.error('Could not remove', { description: error instanceof Error ? error.message : undefined });
    }
  };

  /** Reorder is local-only until the form is saved; index 0 is the primary. */
  const reorder = (from: number, to: number): void => {
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next.map((image, index) => ({ ...image, isPrimary: index === 0 }));
    });
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-brand-cyan bg-brand-cyan/5' : 'border-border bg-surface',
        )}
      >
        <UploadCloud className="size-8 text-brand-cyan" aria-hidden />
        <p className="text-sm font-medium text-brand-navy">Drag images here, or</p>
        <Button type="button" variant="outline" size="sm" isLoading={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus />
          Choose files
        </Button>
        <p className="text-2xs text-muted-foreground">JPEG, PNG, WebP or AVIF · max 5 MB · up to 8 at once</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => void upload(event.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No images yet — the storefront will show the branded placeholder with the SKU.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.publicId}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index);
                setDragIndex(null);
              }}
              className={cn(
                'group relative cursor-grab overflow-hidden rounded-lg border bg-white',
                index === 0 ? 'border-brand-cyan' : 'border-border',
              )}
            >
              <div className="relative aspect-square">
                <Image src={image.url} alt={image.alt} fill sizes="200px" className="object-contain" />
              </div>

              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-brand-cyan px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  <Star className="size-2.5" aria-hidden />
                  Primary
                </span>
              ) : null}

              <div className="flex items-center justify-between gap-1 border-t border-border p-1.5">
                {index !== 0 ? (
                  <button
                    type="button"
                    onClick={() => reorder(index, 0)}
                    className="text-[10px] font-medium text-brand-cyan hover:underline"
                  >
                    Make primary
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Shown first</span>
                )}
                <button
                  type="button"
                  onClick={() => void remove(image.publicId)}
                  aria-label={`Remove image ${index + 1}`}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
