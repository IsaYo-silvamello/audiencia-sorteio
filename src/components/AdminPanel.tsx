import { UserPlus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NovaAudienciaForm from "@/components/NovaAudienciaForm";
import PessoasList from "@/components/PessoasList";

const AdminPanel = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Administrador</h2>
        <p className="text-muted-foreground">Gerencie audiências e pessoas do sistema</p>
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
