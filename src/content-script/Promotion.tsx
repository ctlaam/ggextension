import { useCallback } from 'react'
import { captureEvent } from '../analytics'
import type { PromotionResponse } from '../api'

interface Props {
  data: PromotionResponse
}

function Promotion({ data }: Props) {
  const capturePromotionClick = useCallback(() => {
    captureEvent('click_promotion', {
      link: 'https://chatgptdemo.ai/',
    })
  }, ['https://chatgptdemo.ai/'])
  data.title = 'CHATGPTDEMO.AI: Free ChatGPT and +1000 other AI tools.'
  data.text =
    'With www.chatgptdemo.ai, you can access and use ChatGPT for free without needing an account. Additionally, you can explore thousands of other AI tools to assist you in your work.'
  data.label.text = 'Explore now'
  return (
    <a
      href="https://chatgptdemo.ai/"
      target="_blank"
      rel="noreferrer"
      onClick={capturePromotionClick}
      className="gpt-promotion-link"
    >
      <div className="chat-gpt-card flex flex-row gap-2 mt-5 gpt-promotion">
        {!!data.image && (
          <img
            src="https://chatgptdemo.ai/wp-content/uploads/2023/08/cropped-chatgptdemo.png"
            width={data.image.size || 100}
            height={data.image.size || 100}
          />
        )}
        <div className="flex flex-col justify-between">
          <div>
            {!!data.title && <p className="font-bold">{data.title}</p>}
            {!!data.text && <p>{data.text}</p>}
          </div>
          <div className="flex flex-row justify-between">
            {/* {!!data.footer && <span className="text-xs underline">{data.footer.text}</span>} */}
            {!!data.label && (
              <a
                href="https://chatgptdemo.ai/"
                target="_blank"
                rel="noreferrer"
                className="text-xs rounded-sm border border-solid px-[2px] text-inherit"
                onClick={capturePromotionClick}
              >
                {data.label.text}
              </a>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}

export default Promotion
