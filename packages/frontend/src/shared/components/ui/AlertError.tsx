interface Props {
  message: string;
}

export default function AlertError({ message }: Props) {
  if (message === '') return null;
  return <p className='alert-error'>{message}</p>;
}
