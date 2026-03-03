interface Props {
  message: string;
}

export default function AlertSuccess({ message }: Props) {
  if (message === '') return null;
  return <p className='mb-4 p-2 bg-green-800 text-green-100 text-sm text-center rounded'>{message}</p>;
}
