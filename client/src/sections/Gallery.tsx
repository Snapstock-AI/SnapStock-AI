import { BlurWords, Reveal, SectionTag } from '@/components/landing/primitives'

const columns = [
  [
    { src: '/images/landing/gallery-1.webp', alt: 'Market stall overflowing with fruit and vegetables', ratio: 'aspect-[1.125]' },
    { src: '/images/landing/gallery-3.webp', alt: 'Peppers, potatoes and carrots close up', ratio: 'aspect-[0.835]' },
  ],
  [
    { src: '/images/landing/gallery-5.webp', alt: 'Produce stand in a busy grocery store', ratio: 'aspect-[0.835]' },
    { src: '/images/landing/gallery-2.webp', alt: 'Fresh tropical fruit cut open', ratio: 'aspect-[1.125]' },
  ],
  [{ src: '/images/landing/gallery-6.webp', alt: 'Shopping trolley in a supermarket aisle', ratio: 'aspect-[0.48]' }],
  [
    { src: '/images/landing/gallery-4.webp', alt: 'Neatly stocked shelves of oranges and apples', ratio: 'aspect-[1.125]' },
    { src: '/images/landing/gallery-7.webp', alt: 'Colourful fresh fruit and vegetables', ratio: 'aspect-[0.835]' },
  ],
]

export default function Gallery() {
  return (
    <section id="gallery" className="overflow-hidden bg-cream pt-[60px] pb-[30px] md:pt-20 md:pb-10 xl:pt-[120px] xl:pb-[60px]">
      <div className="flex flex-col items-center gap-10 md:gap-[46px] xl:gap-[52px]">
        <div className="flex flex-col items-center gap-4 px-5 text-center md:gap-5 md:px-[30px]">
          <Reveal>
            <SectionTag>Our gallery</SectionTag>
          </Reveal>
          <BlurWords
            text="Inside a fresher store"
            className="max-w-[625px] text-[36px] leading-[1.2] font-bold text-ink xl:text-[44px] 2xl:text-[52px]"
          />
        </div>

        <Reveal className="flex w-full items-center justify-center">
          {columns.map((column, i) => (
            <div key={i} className="flex max-w-[30%] flex-1 flex-col">
              {column.map((image) => (
                <div key={image.src} className={`group relative w-full overflow-hidden ${image.ratio}`}>
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
