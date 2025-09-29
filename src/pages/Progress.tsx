import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Database } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Tipos
type Progress = Database['public']['Tables']['progress']['Row']
type Member = Database['public']['Tables']['members']['Row']
type Plan = Database['public']['Tables']['plans']['Row']

type ProgressWithNames = Progress & {
  members: { full_name: string } | null
  plans: { name: string } | null
}

const progressSchema = z.object({
  member_id: z.string().uuid({ message: 'Selecione um discípulo.' }),
  plan_id: z.string().uuid({ message: 'Selecione um plano de ação.' }),
  status: z.enum(['Não iniciado', 'Em progresso', 'Concluído']),
  notes: z.string().optional(),
})

export function Progress() {
  const { toast } = useToast()
  const [progress, setProgress] = useState<ProgressWithNames[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para controlar os diálogos e o item selecionado
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProgress, setSelectedProgress] =
    useState<ProgressWithNames | null>(null)

  const form = useForm<z.infer<typeof progressSchema>>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      member_id: '',
      plan_id: '',
      status: 'Não iniciado',
      notes: '',
    },
  })

  async function fetchData() {
    setIsLoading(true)
    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select('*, members(full_name), plans(name)')
      .order('created_at', { ascending: false })

    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*')
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('*')

    if (progressError || membersError || plansError) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar dados',
        description:
          progressError?.message ||
          membersError?.message ||
          plansError?.message,
      })
    } else {
      setProgress(progressData as ProgressWithNames[])
      setMembers(membersData)
      setPlans(plansData)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Efeito para preencher o formulário de edição quando um item é selecionado
  useEffect(() => {
    if (selectedProgress) {
      form.reset({
        member_id: selectedProgress.member_id,
        plan_id: selectedProgress.plan_id,
        status: selectedProgress.status,
        notes: selectedProgress.notes || '',
      })
    }
  }, [selectedProgress, form])

  async function onSubmit(values: z.infer<typeof progressSchema>) {
    setIsSubmitting(true)
    const { error } = await supabase.from('progress').insert([values])
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registar progresso',
        description: error.message,
      })
    } else {
      toast({
        title: 'Sucesso!',
        description: 'Progresso registado com sucesso.',
      })
      form.reset()
      fetchData() // Recarrega os dados para mostrar o novo registo
    }
    setIsSubmitting(false)
  }

  // Função para submeter a edição
  async function onEditSubmit(values: z.infer<typeof progressSchema>) {
    if (!selectedProgress) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('progress')
      .update(values)
      .eq('id', selectedProgress.id)

    setIsSubmitting(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar progresso',
        description: error.message,
      })
    } else {
      toast({
        title: 'Sucesso!',
        description: 'Progresso atualizado com sucesso.',
      })
      setIsEditDialogOpen(false)
      setSelectedProgress(null)
      fetchData() // Recarrega os dados
    }
  }

  // Função para apagar
  async function handleDelete() {
    if (!selectedProgress) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('progress')
      .delete()
      .eq('id', selectedProgress.id)

    setIsSubmitting(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir progresso',
        description: error.message,
      })
    } else {
      toast({
        title: 'Sucesso!',
        description: 'Progresso excluído com sucesso.',
      })
      setIsDeleteDialogOpen(false)
      setSelectedProgress(null)
      fetchData() // Recarrega os dados
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Acompanhamento de Progresso</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registar Novo Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discípulo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o discípulo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano de Ação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                        <SelectItem value="Em progresso">Em progresso</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anotações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione anotações relevantes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Progressos</CardTitle>
          <CardDescription>
            Visualize todos os progressos registados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discípulo</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anotações</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : progress.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum progresso encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                progress.map(progressItem => (
                  <TableRow key={progressItem.id}>
                    <TableCell>
                      {progressItem.members?.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>{progressItem.plans?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge>{progressItem.status}</Badge>
                    </TableCell>
                    <TableCell>{progressItem.notes}</TableCell>
                    <TableCell>
                      {new Date(progressItem.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProgress(progressItem)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedProgress(progressItem)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogo de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Progresso</DialogTitle>
            <DialogDescription>
              Atualize as informações do progresso abaixo.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onEditSubmit)}
              className="space-y-8"
            >
              {/* Campos do formulário são os mesmos da criação */}
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discípulo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o discípulo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano de Ação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                        <SelectItem value="Em progresso">Em progresso</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anotações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione anotações relevantes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Excluir */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá apagar permanentemente o
              registo de progresso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
