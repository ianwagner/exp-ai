import StepRunner from '../components/StepRunner';

export default function RunnerPage() {
  return (
    <div className="min-h-screen flex items-center justify-center md:p-5">
      <main className="bg-[#212121] max-w-[750px] w-full p-[8px] sm:p-[20px] rounded-[10px]">
        <h1 className="text-2xl font-bold mb-4">Step Runner</h1>
        <StepRunner />
      </main>
    </div>
  );
}
