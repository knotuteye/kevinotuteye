import { colors as themeColors } from '../../Theme'

export type Image = {
    url: string,
    header: string,
    description: string,
    projectLink: string
}

type ImageGridProps = {
    images: Array<Image>
}

export default function ImageGrid({ images }: ImageGridProps) {
    const colors = Object.keys(themeColors)

    return <div className="md:grid md:gap-x-4 md:gap-y-10 md:grid-cols-3 flex flex-col">
        {images.map((image, i) => {
            let color = colors[i % colors.length];
            return <div
                key={image.url}
                className={`md:h-64 h-[calc(100vw*0.7)] my-4 w-full border-2 border-${color}`}
                style={{
                    backgroundImage: 'url(/img/profile.png)',
                    backgroundSize: 'cover',
                }}
            >
            </div>
        }
        )}
    </div>

}