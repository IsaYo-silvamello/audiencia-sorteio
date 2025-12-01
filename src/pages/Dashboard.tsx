import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Scale, LogOut, UserPlus, Calendar, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudienciasList from "@/components/AudienciasList";
import NovaAudienciaForm from "@/components/NovaAudienciaForm";
import PessoasList from "@/components/PessoasList";
import SorteioAudiencias from "@/components/SorteioAudiencias";
import DashboardHome from "@/components/DashboardHome";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Juris Audiências</h1>
              <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Área Administrativa
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">
              <Calendar className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="audiencias">
              <Calendar className="h-4 w-4 mr-2" />
              Audiências
            </TabsTrigger>
            <TabsTrigger value="nova">
              <UserPlus className="h-4 w-4 mr-2" />
              Nova Audiência
            </TabsTrigger>
            <TabsTrigger value="pessoas">
              <Users className="h-4 w-4 mr-2" />
              Pessoas
            </TabsTrigger>
            <TabsTrigger value="sorteio">
              <Scale className="h-4 w-4 mr-2" />
              Sorteio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardHome />
          </TabsContent>

          <TabsContent value="audiencias">
            <AudienciasList />
          </TabsContent>

          <TabsContent value="nova">
            <NovaAudienciaForm />
          </TabsContent>

          <TabsContent value="pessoas">
            <PessoasList />
          </TabsContent>

          <TabsContent value="sorteio">
            <SorteioAudiencias />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
