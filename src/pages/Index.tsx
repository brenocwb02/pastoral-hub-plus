import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  MessageCircle, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  Heart,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Star
} from "lucide-react";
import { setSEO } from "@/lib/seo";
import { useEffect } from "react";

const features = [
  {
    icon: Users,
    title: "Gestão de Membros",
    description: "Cadastre e acompanhe todos os membros da igreja com informações detalhadas e histórico espiritual."
  },
  {
    icon: Building2,
    title: "Casas de Paz",
    description: "Organize e gerencie as casas de paz, definindo líderes e acompanhando o crescimento."
  },
  {
    icon: MessageCircle,
    title: "Encontros 1 a 1",
    description: "Agende e registre encontros individuais de discipulado com integração ao Google Calendar."
  },
  {
    icon: Calendar,
    title: "Reuniões Gerais",
    description: "Planeje e coordene reuniões gerais com sincronização automática de calendário."
  },
  {
    icon: BookOpen,
    title: "Planos de Estudo",
    description: "Crie e gerencie planos de estudo bíblico personalizados para diferentes níveis."
  },
  {
    icon: TrendingUp,
    title: "Acompanhamento Espiritual",
    description: "Monitore o progresso espiritual individual com métricas e relatórios detalhados."
  }
];

const benefits = [
  {
    icon: Heart,
    title: "Cuidado Pastoral",
    description: "Facilita o cuidado personalizado e o acompanhamento próximo de cada membro."
  },
  {
    icon: Shield,
    title: "Seguro e Confiável",
    description: "Dados protegidos com criptografia e backup automático na nuvem."
  },
  {
    icon: Zap,
    title: "Fácil de Usar",
    description: "Interface intuitiva que qualquer líder pode aprender rapidamente."
  }
];

const testimonials = [
  {
    name: "Pastor João Silva",
    role: "Pastor Principal",
    content: "O Cuidar+ revolucionou nossa forma de cuidar dos membros. Agora conseguimos acompanhar cada pessoa de perto.",
    rating: 5
  },
  {
    name: "Ana Beatriz",
    role: "Líder de Casa",
    content: "Muito prático para organizar os encontros e ver o crescimento espiritual de cada discípulo.",
    rating: 5
  },
  {
    name: "Carlos Eduardo",
    role: "Discipulador",
    content: "A integração com o Google Calendar economiza muito tempo no agendamento dos encontros 1 a 1.",
    rating: 5
  }
];

export default function Index() {
  useEffect(() => {
    setSEO(
      "Cuidar+ - Sistema de Gestão Pastoral e Discipulado",
      "Plataforma completa para gestão pastoral, discipulado e acompanhamento espiritual. Gerencie membros, casas de paz, encontros 1 a 1 e muito mais."
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="absolute inset-0 opacity-40"></div>
        
        <div className="container mx-auto px-4 py-24 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              ✨ Sistema Completo de Gestão Pastoral
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Cuide de cada
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {" "}alma{" "}
              </span>
              com excelência
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Plataforma completa para gestão pastoral, discipulado e acompanhamento espiritual. 
              Gerencie membros, organize casas de paz e acompanhe o crescimento espiritual de cada pessoa.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button asChild size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                <Link to="/auth">
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="/dashboard">Ver Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Tudo que você precisa para
              <span className="text-primary"> cuidar bem</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Funcionalidades pensadas especialmente para líderes, pastores e discipuladores
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
                Por que escolher o
                <span className="text-primary"> Cuidar+</span>?
              </h2>
              
              <div className="space-y-8">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <span className="text-lg">Interface intuitiva e moderna</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <span className="text-lg">Integração com Google Calendar</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <span className="text-lg">Relatórios detalhados</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <span className="text-lg">Segurança de dados</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <span className="text-lg">Suporte especializado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              O que nossos
              <span className="text-primary"> líderes dizem</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Histórias reais de transformação e crescimento
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary-glow">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-primary-foreground">
              Pronto para transformar seu ministério?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de líderes que já estão usando o Cuidar+ para cuidar melhor de suas ovelhas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
                <Link to="/auth">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link to="/dashboard">Conhecer Sistema</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">C+</span>
              </div>
              <span className="font-bold text-xl">Cuidar+</span>
            </div>
            <p className="text-muted-foreground text-center md:text-right">
              © 2024 Cuidar+. Transformando ministérios através da tecnologia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}