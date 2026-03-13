import { Calendar, Settings } from "lucide-react";
import logoSmaart from "@/assets/logosmaart.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudienciasList from "@/components/AudienciasList";
import AdminPanel from "@/components/AdminPanel";
import DashboardHome from "@/components/DashboardHome";

const Dashboard = () => {

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 bg-sky-100">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center">
              <img src={logoSmaart} alt="Smaart Aud logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Smaart Aud </h1>
              <p className="text-xs text-muted-foreground">Sistema de Pauta de Audiências     </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dashboard">
              <Calendar className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="audiencias">
              <Calendar className="h-4 w-4 mr-2" />
              Audiências
            </TabsTrigger>
            <TabsTrigger value="admin">
              <Settings className="h-4 w-4 mr-2" />
              Administrador
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardHome />
          </TabsContent>

          <TabsContent value="audiencias">
            <AudienciasList />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>);

};

export default Dashboard;