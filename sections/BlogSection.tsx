export default function BlogSection({}) {
  return (
    <div className="flex flex-col px-20 py-16 ">
      <div className="flex gap-x-3 text-4xl items-center p-5 text-redSalsa">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mt-1 h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <h1 className="font-heading">Recent Publications</h1>
      </div>
    </div>
  )
}
