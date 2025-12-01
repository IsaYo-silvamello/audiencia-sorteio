import { useState, useEffect } from "react";
import { UserPlus, Users, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import NovaAudienciaForm from "@/components/NovaAudienciaForm";
import PessoasList from "@/components/PessoasList";
import AdminLogin from "@/components/AdminLogin";

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar se já está autenticado
    const adminAuth = sessionStorage.getItem("adminAuthenticated");
    if (adminAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem("adminAuthenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Administrador</h2>
          <p className="text-muted-foreground">Gerencie audiências e pessoas do sistema</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      <Tabs defaultValue="nova-audiencia" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="nova-audiencia">
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Audiência
          </TabsTrigger>
          <TabsTrigger value="pessoas">
            <Users className="h-4 w-4 mr-2" />
            Pessoas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova-audiencia" className="mt-6">
          <NovaAudienciaForm />
        </TabsContent>

        <TabsContent value="pessoas" className="mt-6">
          <PessoasList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

