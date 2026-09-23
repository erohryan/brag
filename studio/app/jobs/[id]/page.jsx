import JobView from '../../../components/JobView.jsx';

export default function JobPage({ params }) {
  return <JobView id={params.id} />;
}
