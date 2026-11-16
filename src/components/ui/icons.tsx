import type { SVGProps } from 'react'
import type { IconType } from 'react-icons'
import { FaLinkedin } from 'react-icons/fa6'
import {
  FiArrowLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiDownload,
  FiFolder,
  FiGlobe,
  FiHome,
  FiMapPin,
  FiMenu,
  FiMessageCircle,
  FiMoon,
  FiMoreHorizontal,
  FiPause,
  FiPlay,
  FiRotateCcw,
  FiSquare,
  FiSun,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { SiBuymeacoffee, SiGithub, SiGmail, SiX } from 'react-icons/si'

type IconProps = SVGProps<SVGSVGElement>

function adapt(Icon: IconType, displayName: string) {
  function AdaptedIcon({ className }: IconProps) {
    return <Icon className={className} aria-hidden="true" />
  }
  AdaptedIcon.displayName = displayName
  return AdaptedIcon
}

export const GitHubIcon = adapt(SiGithub, 'GitHubIcon')
export const LinkedInIcon = adapt(FaLinkedin, 'LinkedInIcon')
export const XIcon = adapt(SiX, 'XIcon')
export const GlobeIcon = adapt(FiGlobe, 'GlobeIcon')
export const MailIcon = adapt(SiGmail, 'MailIcon')
export const CoffeeIcon = adapt(SiBuymeacoffee, 'CoffeeIcon')
export const HomeIcon = adapt(FiHome, 'HomeIcon')
export const FolderIcon = adapt(FiFolder, 'FolderIcon')
export const UserIcon = adapt(FiUser, 'UserIcon')
export const MessageIcon = adapt(FiMessageCircle, 'MessageIcon')
export const EllipsisIcon = adapt(FiMoreHorizontal, 'EllipsisIcon')
export const MenuIcon = adapt(FiMenu, 'MenuIcon')
export const CloseIcon = adapt(FiX, 'CloseIcon')
export const ArrowUpRightIcon = adapt(FiArrowUpRight, 'ArrowUpRightIcon')
export const ArrowLeftIcon = adapt(FiArrowLeft, 'ArrowLeftIcon')
export const StopIcon = adapt(FiSquare, 'StopIcon')
export const PauseIcon = adapt(FiPause, 'PauseIcon')
export const PlayIcon = adapt(FiPlay, 'PlayIcon')
export const ArrowRightIcon = adapt(FiArrowRight, 'ArrowRightIcon')
export const HistoryIcon = adapt(FiRotateCcw, 'HistoryIcon')
export const TrashIcon = adapt(FiTrash2, 'TrashIcon')
export const MapPinIcon = adapt(FiMapPin, 'MapPinIcon')
export const DownloadIcon = adapt(FiDownload, 'DownloadIcon')
export const SunIcon = adapt(FiSun, 'SunIcon')
export const MoonIcon = adapt(FiMoon, 'MoonIcon')
