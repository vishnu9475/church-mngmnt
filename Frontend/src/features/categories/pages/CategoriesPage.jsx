
import  {CategoryManagement}  from '../components/CategoryManagement';
import Sidemenu from '../../../components/common/Sidemenu';

function Page() {
  return (
    <div className='min-h-screen w-full bg-[#f9fafc]'>
      <Sidemenu/>
      <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 lg:ml-65 lg:px-8" >
        <div className="mx-auto w-full max-w-[2560px] space-y-6">
          <CategoryManagement />
        </div>
      </main>
    </div>
  );
}

export default Page;
