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
      Browser.runtime.openOptionsPage()
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
    await Browser.runtime.openOptionsPage()
    await Browser.tabs.create({ url: 'https://chatgptdemo.ai' })
    setTimeout(() => {
      Browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        // tabs là một mảng chứa thông tin về tất cả các tab
        tabs.forEach((tab) => {
          if (tab.url == 'https://chatgptdemo.ai/') {
            console.log(tab.id)
          }
        })
      })
    }, 1000)
  }
})

// Browser.runtime.onInstalled.addListener((details) => {
//   if (details.reason === 'install') {
//     Browser.tabs.create({ url: 'https://chatgptdemo.ai' })
//     // Gửi dữ liệu từ tab nguồn
//     // Tìm tab hoặc cửa sổ mục tiêu bằng URL
//     Browser.tabs.query({ url: 'https://chatgptdemo.ai/*' })
//     .then(tabs => {
//       if (tabs.length > 0) {
//         // Tìm thấy tab mục tiêu, bạn có thể lấy tab đầu tiên
//         const targetTab = tabs[0];

//         // Gửi dữ liệu tới tab mục tiêu bằng window.postMessage
//         const message = { data: 'Dữ liệu bạn muốn gửi' };
//         targetTab.id && Browser.tabs.executeScript(targetTab.id, {
//           code: `window.postMessage(${JSON.stringify(message)}, 'https://chatgptdemo.ai/');`
//         });
//       }
//     })
//     .catch(error => {
//       console.error(error);
//     });
//   }
// })
