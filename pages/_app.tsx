import type { AppProps } from 'next/app'
import 'tailwindcss/tailwind.css'
import Header from '../components/Header'
import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header></Header>
      <Component {...pageProps}></Component>
    </>
  )
}
export default MyApp
