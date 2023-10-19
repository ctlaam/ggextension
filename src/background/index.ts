import Browser from 'webextension-polyfill'
import { getProviderConfigs, ProviderType } from '../config'
import { ChatGPTProvider, getChatGPTAccessToken, sendMessageFeedback } from './providers/chatgpt'
import { OpenAIProvider } from './providers/openai'
import { Provider } from './types'

async function generateAnswers(port: Browser.Runtime.Port, question: string) {
  const providerConfigs = await getProviderConfigs()

  let provider: Provider
  if (providerConfigs.provider === ProviderType.ChatGPT) {
    const token = await getChatGPTAccessToken()
    provider = new ChatGPTProvider(token)
  } else if (providerConfigs.provider === ProviderType.GPT3) {
    const { apiKey, model } = providerConfigs.configs[ProviderType.GPT3]!
    provider = new OpenAIProvider(apiKey, model)
  } else {
    throw new Error(`Unknown provider ${providerConfigs.provider}`)
  }

  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    controller.abort()
    cleanup?.()
  })

  const { cleanup } = await provider.generateAnswer({
    prompt: question,
    signal: controller.signal,
    onEvent(event) {
      if (event.type === 'done') {
        port.postMessage({ event: 'DONE' })
        return
      }
      port.postMessage(event.data)
    },
  })
}

Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    console.debug('received msg', msg)
    try {
      await generateAnswers(port, msg.question)
    } catch (err: any) {
      console.error(err)
      port.postMessage({ error: err.message })
    }
  })
})

Browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'FEEDBACK') {
    const token = await getChatGPTAccessToken()
    await sendMessageFeedback(token, message.data)
  } else if (message.type === 'OPEN_OPTIONS_PAGE') {
    Browser.runtime.openOptionsPage()
  } else if (message.type === 'GET_ACCESS_TOKEN') {
    return getChatGPTAccessToken()
  }
})

Browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await Browser.tabs.create({ url: 'https://chatgptdemo.ai' })
    setTimeout(() => {
      Browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        // tabs là một mảng chứa thông tin về tất cả các tab
        tabs.forEach((tab) => {
          if (tab.url == 'https://chatgptdemo.ai/') {
            Browser.scripting.executeScript({
              target: { tabId: tab.id },
              func: openPopup,
            })
          }
        })
      })
    }, 2000)
  }
})
function openPopup() {
  //viết đoạn code mở popup ở đây
  const welcomeElement = document.getElementById('welcome')
  if (welcomeElement) {
    // Bỏ lớp CSS "hidden" để hiển thị phần tử
    welcomeElement.removeAttribute('hidden')

    // Áp dụng animation
    setTimeout(function () {
      welcomeElement.style.animation = 'fadeInOut 3s ease-in-out'
    }, 8000) // 5000 milliseconds tương đương 5 giây
    // Đặt một thời gian để sau đó ẩn phần tử lại
    setTimeout(function () {
      welcomeElement.setAttribute('hidden', true)
    }, 10000) // 5000 milliseconds tương đương 5 giây
  }
}

Browser.runtime.setUninstallURL('https://chatgptdemo.ai/feedback/')
