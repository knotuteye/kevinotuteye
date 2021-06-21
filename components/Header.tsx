import Head from 'next/head'

type HeaderProp = { pageTitle?: string }

export default function Header({ pageTitle }: HeaderProp) {
  return (
    <Head>
      <title>{pageTitle || 'Kevin Otuteye | Portfolio'} </title>
      <meta
        name="description"
        content="Hey there. I'm Kevin Otuteye, a full stack developer and music enthusiast. Here are some of my works."
      />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Raleway&display=swap"
        rel="stylesheet"
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap"
        rel="stylesheet"
      />

      <link rel="icon" href="/favicon.ico" />
    </Head>
  )
}
