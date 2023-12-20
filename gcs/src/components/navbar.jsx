import { Link } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'

export default function Navbar({ currentPage }) {
  const linkClassName =
    'text-md hover:text-falconred-60 transition-colors delay-50'
  return (
    <div className="flex flex-row space-x-6 justify-center py-4">
      <Link
        to="/"
        className={twMerge(
          linkClassName,
          currentPage === 'dashboard' && 'text-falconred font-bold',
        )}
      >
        Dashboard
      </Link>
      <Link
        to="/graphs"
        className={twMerge(
          linkClassName,
          currentPage === 'graphs' && 'text-falconred font-bold',
        )}
      >
        Graphs
      </Link>
      <Link
        to="/params"
        className={twMerge(
          linkClassName,
          currentPage === 'params' && 'text-falconred font-bold',
        )}
      >
        Params
      </Link>
      <Link
        to="/all-data"
        className={twMerge(
          linkClassName,
          currentPage === 'all-data' && 'text-falconred font-bold',
        )}
      >
        All data
      </Link>
    </div>
  )
}
