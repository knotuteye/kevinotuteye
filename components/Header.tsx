import Head from "next/head";

type HeaderProp = { pageTitle?: string };
export default function Header({ pageTitle }: HeaderProp) {
  return (
    <Head>
      <title>{pageTitle || "Kevin Otuteye | Portfolio"} </title>
      <meta
        name="description"
        content="Hey there. I'm Kevin Otuteye, a full stack developer and music enthusiast. Here are some of my works."
      />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}
