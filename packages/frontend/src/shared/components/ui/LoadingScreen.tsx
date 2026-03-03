interface Props {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: Props) {
  return (
    <div className='retro-bg flex items-center justify-center min-h-screen'>
      <p className='text-purple-300'>{message}</p>
    </div>
  );
}
