import type { AppProps } from 'next/app'
import Head from 'next/head'
import 'tailwindcss/tailwind.css'
import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Kevin Otuteye | Portfolio </title>
      </Head>
      <Component {...pageProps}></Component>
    </>
  )
}
export default MyApp
