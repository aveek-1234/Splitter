"use client"
import { CategoryAutocomplete } from "./CategoryAutocomplete"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import { useFetchQuery } from "@/hooks/useFetchQuery"
import { useMutateQuery } from "@/hooks/useMutateQuery"
import { expenseCategories } from "@/lib/expenseCategory"
import { Group, Split, User } from "@/lib/models"
import { SplitSelector, SplitType } from "./SplitSelector"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import {z} from "zod"
import { GroupSelector, type GroupWithMembers } from "./GroupSelector"
import { ParticipantSelector } from "./ParticipantSelector"

type ExpenseFormProps = {
  type: "individual" | "group"
  id?: string
  onSuccess: (id: string) => void
}

const expenseSchema= z.object({
  description: z.string().min(1,"Description is required"),
  amount: z.string().min(1,"Amount is required").refine((val)=>!isNaN(parseFloat(val)) && parseFloat(val)>0,{
    message:"Amount must be a positive number"
  }),
  category: z.string().optional(),
  date:z.date(),
  paidByUserId: z.string().min(1,"Payer is required"),
  splitType: z.enum(["equal", "percentage", "exact amount"]),
  groupId: z.string().optional()
})

function ExpenseForm({ type, onSuccess, id }: ExpenseFormProps) {
  // const [participants, setParticipants] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [showParticipantError, setShowParticipantError] = useState(false);

  // Get group data with members for group expenses.  the API returns
  // "GroupWithMembers" objects (see GroupSelector) so we can read each
  // member's name/email/imageUrl directly.
  const { data: userGroups = [] } = useFetchQuery<GroupWithMembers[]>(
    api.groupExpenses.getUserGroupsWithMembers
  );

  const {data: currentUser}= useFetchQuery<User>(api.users.getCurrentUser);

  const createExpense= useMutateQuery(api.createExpense.createExpense);

  const categories = expenseCategories;
  
  const {
    register,
    handleSubmit,
    formState,
    watch,
    reset,
    control
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: new Date(),
      paidByUserId: currentUser?._id || "",
      splitType: "equal",
      // start with undefined; will update via Controller when user picks a group
      groupId: type === "group" ? undefined : undefined
    }
  })
  const { isSubmitting,errors } = formState;

  const amount= watch("amount");
  const paidByUserId= watch("paidByUserId");

  const total = parseFloat(amount) || 0;
  const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const splitsMismatch = Math.abs(splitsTotal - total) > 0.01;

  // Clear participant error when participants change
  useEffect(() => {
    if (showParticipantError && selectedParticipants.length >= 2) {
      setShowParticipantError(false);
    }
  }, [selectedParticipants.length, showParticipantError]);

  // keep track of the groupId field so we can derive selectedGroup for other logic
  const groupIdValue = watch("groupId");

  // whenever the form's type or groupId changes we may need to update the
  // list of participants.  In the ‘group’ case we auto‑populate the list with
  // every member of the selected group; switching back to an individual expense
  // clears the collection so the user can start fresh.
  useEffect(() => {
    if (type === "group" && groupIdValue && userGroups.length > 0) {
      // GroupWithMembers uses `id` instead of `_id`.
      const groupSelectedByUser = userGroups.find((g) => g.id === groupIdValue);
      if (groupSelectedByUser) {
        // convert group members to the `User` shape; tokenId isn't available from
        // the group payload so just use an empty string (it isn't needed in the
        // form). imageUrl is optional on the group member type, so keep it that way.
        const groupMembers: User[] = groupSelectedByUser.members.map((member) => ({
          _id: member.id,
          name: member.name,
          email: member.email,
          imageUrl: member.imageUrl,
          tokenId: "",
        }));
        if(selectedGroup && selectedGroup.id === groupSelectedByUser.id){
          // if the user re‑selects the same group, don't reset the participants (which would also reset the paidByUserId and splits, causing a bad UX)
          return;
        }
        setSelectedParticipants(groupMembers);
        setSelectedGroup(groupSelectedByUser);
      }
    } else if (type !== "group") {
      // clear any existing participants when user switches to individual
      if(selectedParticipants.length > 0 || selectedGroup !== null){
        setSelectedParticipants([]);
        setSelectedGroup(null);
      }
    }
  }, [type, groupIdValue, userGroups,selectedGroup]);


  const participants = useMemo(() => {
    if (type !== "group" && currentUser) {
      const currentUserSelected = selectedParticipants.some(
        (participant) => participant._id === currentUser._id
      )
      return currentUserSelected
        ? selectedParticipants
        : [...selectedParticipants, currentUser]
    }
    return selectedParticipants
  }, [type, currentUser, selectedParticipants])

  if(!currentUser) return null;

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    const total = parseFloat(data.amount) || 0;
    const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    const tolerance = 0.01;
    if (Math.abs(splitsTotal - total) > tolerance) {
      // mismatch - should already be disabled, but guard anyway
      return;
    }
    if (type === "individual" && selectedParticipants.length < 2) {
      // insufficient participants - show error and prevent submission
      setShowParticipantError(true);
      return;
    }

    // Clear any previous error when proceeding with valid submission
    setShowParticipantError(false);

    try {
      const expenseId = await createExpense.mutate({
        description: data.description,
        amount: total,
        category: data.category || undefined,
        date: data.date.getTime(),
        paidByUserId: data.paidByUserId,
        splitType: data.splitType,
        splits,
        groupId: type === "group" ? data.groupId : undefined,
      });
      onSuccess(type==="individual"? participants?.[1]?._id as string : selectedGroup?.id as string);
      reset();
    } catch (err) {
      console.error("failed to create expense", err);
      // TODO: show user-facing error (toast/snackbar) if desired
    }
  }


  return (
     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input {...register("description")} id="description" placeholder="Enter description" />
        {errors.description && <p className="text-red-500">{errors.description.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input {...register("amount")} id="amount" placeholder="Enter amount" />
        {errors.amount && <p className="text-red-500">{errors.amount.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryAutocomplete
              value={field.value ?? ""}
              onChange={field.onChange}
              categories={categories}
              error={errors.category}
            />
          )}
        />
        {errors.category && <p className="text-red-500">{errors.category.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Controller 
          name="date"
          control={control}
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Input
                  id="date"
                  readOnly
                  value={field.value ? new Date(field.value).toLocaleDateString() : ""}
                  placeholder="Select date"
                />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date)}
                />
              </PopoverContent>
            </Popover>
          )}
        />
        {errors.date && <p className="text-red-500">{errors.date.message}</p>}
      </div>
      {type === "group" && (
        <div className="space-y-2">
          <Controller
          name="groupId"
          control={control}
          render={({ field }) => (
            <GroupSelector
              id={id}
              value={field.value ?? ""}
              onChange={(id) => {
                field.onChange(id);
                // optionally update selectedGroup state if you have group data available
                setSelectedGroup(null);
              }}
              error={errors.groupId}
              disabled={isSubmitting}
            />
          )}
        />
        </div>
      )}
      {
        // only show the selector when we're creating an individual expense – when
        // the type is "group" the list of participants is derived automatically
        // from the chosen group and the user should not be able to modify it.
        type === "individual" && (
          <ParticipantSelector
            id={id}
            selectedParticipants={participants}
            onChange={(selected) => {
              setSelectedParticipants(selected);
            }}
            disabled={isSubmitting}
          />
        )
      }
      {
        // determine if we should render the "paid by" dropdown. for group
        // expenses we expect selectedParticipants to already contain every member
        // of the group; for individual expenses we only show it once the user has
        // picked at least one participant.
        (participants.length > 0) && (
          <div className="space-y-2">
            <Label htmlFor="paidBy">Paid by</Label>
            <Controller
              name="paidByUserId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.filter((participant) => participant && participant._id && participant.name).map((participant) => (
                      <SelectItem key={participant._id} value={participant._id}>
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paidByUserId && <p className="text-red-500">{errors.paidByUserId.message}</p>}
          </div>
        )
    }

      {/* split type selector */}
      <div className="space-y-2">
        <Label>Split type</Label>
        <Controller
          name="splitType"
          control={control}
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange}>
              <TabsList>
                <TabsTrigger value="equal">Equal</TabsTrigger>
                <TabsTrigger value="percentage">Percentage</TabsTrigger>
                <TabsTrigger value="exact amount">Exact</TabsTrigger>
              </TabsList>
              <TabsContent value="equal">
                <SplitSelector
                  type="equal"
                  amount={amount}
                  participants={participants}
                  paidByUserId={paidByUserId}
                  currentUserId={currentUser._id}
                  onSplitsChange={setSplits}
                />
              </TabsContent>
              <TabsContent value="percentage">
                <SplitSelector
                  type="percentage"
                  amount={amount}
                  participants={participants}
                  paidByUserId={paidByUserId}
                  currentUserId={currentUser._id}
                  onSplitsChange={setSplits}
                />
              </TabsContent>
              <TabsContent value="exact amount">
                <SplitSelector
                  type="exact amount"
                  amount={amount}
                  participants={participants}
                  paidByUserId={paidByUserId}
                  currentUserId={currentUser._id}
                  onSplitsChange={setSplits}
                />
              </TabsContent>
            </Tabs>
          )}
        />
      </div>

      {/* total validation message + submit */}
      {splitsMismatch && (
        <p className="text-red-500">
          The split amounts ({splitsTotal.toFixed(2)}) must add up to the
          total ({total.toFixed(2)}).
        </p>
      )}
      {showParticipantError && (
        <p className="text-red-500">
          Please select at least 2 participants to split the expense.
        </p>
      )}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || splitsMismatch}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save Expense"}
        </button>
      </div>

     </form>
  )
}

export default ExpenseForm
