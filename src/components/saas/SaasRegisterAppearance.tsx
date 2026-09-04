import { useId } from 'react';
import { ImageIcon, Palette, Upload, X } from 'lucide-react';

const PRESETS = ['#ffffff', '#edf4ff', '#edf9f1', '#fff5e8', '#f6efff', '#fff0f0', '#edf8fa', '#f1f3f5'];

type Props = {
  allowImage?: boolean;
  imageUrl?: string | null;
  cardColor?: string;
  onImageChange?: (file: File) => void;
  onRemoveImage?: () => void;
  onColorChange: (color: string) => void;
  imageLabel?: string;
};

export default function SaasRegisterAppearance({
  allowImage = false,
  imageUrl,
  cardColor = '#ffffff',
  onImageChange,
  onRemoveImage,
  onColorChange,
  imageLabel = 'Imagem do cadastro',
}: Props) {
  const inputId = useId();
  const color = /^#[0-9a-f]{6}$/i.test(cardColor || '') ? cardColor : '#ffffff';

  return (
    <section className="rounded-xl border border-[#dce2e9] bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#dce2e9] bg-[#f7f9fb] text-[#536077]">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#17233b]">Identificação visual</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#7a8698]">
            A cor ocupa o card inteiro na listagem para localizar este cadastro mais rápido.
          </p>
        </div>
      </div>

      <div className={`grid gap-5 ${allowImage ? 'lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]' : ''}`}>
        {allowImage && (
          <div>
            <p className="mb-2 text-[11px] font-medium text-[#344054]">{imageLabel}</p>
            <div className="flex items-center gap-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#dce2e9] bg-[#f5f7f9] text-[#98a2b3]">
                {imageUrl ? (
                  <img src={imageUrl} alt="Prévia" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  id={inputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file && onImageChange) onImageChange(file);
                    event.currentTarget.value = '';
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor={inputId}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#d7dde5] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafb]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {imageUrl ? 'Trocar imagem' : 'Enviar imagem'}
                  </label>
                  {imageUrl && onRemoveImage && (
                    <button
                      type="button"
                      onClick={onRemoveImage}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#eadede] bg-white px-3 text-xs font-semibold text-[#8f3d3d] transition hover:bg-[#fff8f8]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-[#8a95a5]">PNG, JPG, WEBP ou GIF. Use uma imagem quadrada quando possível.</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-[#344054]">Cor do card</p>
            <button
              type="button"
              onClick={() => onColorChange('#ffffff')}
              className="text-[10px] font-medium text-[#667085] hover:text-[#17233b]"
            >
              Remover cor
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                aria-label={`Usar cor ${preset}`}
                onClick={() => onColorChange(preset)}
                className={`h-8 w-8 rounded-full border transition ${color.toLowerCase() === preset ? 'scale-110 border-[#344054] shadow-sm' : 'border-[#d5dbe2] hover:scale-105'}`}
                style={{ backgroundColor: preset }}
              />
            ))}
            <label className="ml-1 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#d7dde5] bg-white px-3 text-[11px] font-semibold text-[#344054]">
              <input
                type="color"
                value={color}
                onChange={event => onColorChange(event.target.value)}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              />
              Personalizar
            </label>
          </div>
          <div className="mt-3 rounded-lg border border-black/10 px-3 py-2.5 text-xs font-medium" style={{ backgroundColor: color, color: readableText(color) }}>
            Prévia da cor escolhida
          </div>
        </div>
      </div>
    </section>
  );
}

export function readableText(color?: string) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return '#17233b';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.58 ? '#ffffff' : '#17233b';
}
