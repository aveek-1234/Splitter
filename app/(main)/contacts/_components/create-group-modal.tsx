import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateGroupModalProps, User } from '@/lib/models'
import {useForm} from "react-hook-form";
import {zodResolver} from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { defaultValues, groupSchema, type GroupFormValues } from '@/form_helpers/createGroupFormHelper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { api } from '@/convex/_generated/api';
import { Badge, UserPlus } from 'lucide-react';
import { Avatar } from '@radix-ui/react-avatar';
import { AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { PopoverContent } from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CommandList } from 'cmdk';
import { useMutateQuery } from '@/hooks/useMutateQuery';
import { on } from 'events';
import { err } from 'inngest/types';
import { Id } from '@/convex/_generated/dataModel';



function CreateGroupModal({isOpen,onClose,onSuccess}: CreateGroupModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: currentUser } = useFetchQuery<User>(api.users.getCurrentUser);
  const { data: searchedUsers, loading: isSearching } = useFetchQuery<User[]>(
    api.users.searchUsers,
    { query: searchQuery }
  );

  const createGroup = useMutateQuery(api.contacts.createGroup);
  
  const {
    register,
    handleSubmit,
    formState,
    reset
  } = useForm({
    resolver: zodResolver({...groupSchema}),
    defaultValues:{
      ...defaultValues
    }
  })
  const { isSubmitting,errors } = formState;
    
  const handleClose = (open?: boolean) => {
    reset();
    setSelectedMembers([]);
    onClose(open ?? false);
  };

  const onSubmit = async (data: GroupFormValues) => {
    try {
      const memberIds= searchedUsers?.map((user) => user._id);
      const groupId= await createGroup.mutate({
        name: data.name,
        description: data.description,
        members: memberIds as Id<"users">[] 
      }) as string;
      handleClose(false);
      if (onSuccess) {
        onSuccess(groupId);
      }
    } catch (error) {
      console.log(error);
    }
  }
  return (
<Dialog open={isOpen} onOpenChange={handleClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Group</DialogTitle>
    </DialogHeader>
    <form className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
      <div>
       <Label htmlFor='name'>Group Name</Label>
        <Input
          id='name'
          placeholder='Please enter group name'
          {...register("name")}
        />
        {formState.errors.name && <p className="text-red-500">{formState.errors.name.message}</p>}
      </div>
      <div>
       <Label htmlFor='description'>Description (Optional)</Label>
        <Textarea
          id='description'
          placeholder='Please enter group description'
          {...register("description")}
        />
        {formState.errors.description && <p className="text-red-500">{formState.errors.description.message}</p>}
      </div>
      <div className='space-y-2'>
        <Label>Members</Label>
        <div>
            {currentUser && (
              <Badge>
                <Avatar>
                  <AvatarImage src={currentUser.imageUrl} />
                  <AvatarFallback>
                    {currentUser.name.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{currentUser.name}</span>
              </Badge>
            )}

            {selectedMembers.map((member) => (
              <Badge key={member._id}>
                <Avatar>
                  <AvatarImage src={member.imageUrl} />
                  <AvatarFallback>
                    {member.name.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{member.name}</span>
                <button
                type='button'
                onClick={() => setSelectedMembers(prev => prev.filter(m => m._id !== member._id))}
                >
                  <span className="sr-only">X</span>
                </button>
              </Badge>
            ))}

            <Popover open={commandOpen} onOpenChange={setCommandOpen}>
              <PopoverTrigger asChild>
                <Button 
                type='button'
                variant="outline"
                className="h-8 gap-1 text-xs"
                size="sm"
                >
                 <UserPlus className="h-4 w-4" />
                 Add Group Memeber 
                </Button>
              </PopoverTrigger>
              <PopoverContent align='start' side='bottom'>
                <Command>
                  <CommandInput 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                    {!searchQuery.length?
                    (<p>Please type atleast one character for search</p>)
                    : 
                    isSearching?(<p>Loading...</p>):(<p>No users found.</p>)
                    }
                    </CommandEmpty>
                    <CommandGroup heading="Contacts">
                      {searchedUsers?.map((user) => (
                        <CommandItem key={user._id} onSelect={() => {
                          setSelectedMembers(prev => [...prev, user]);
                          setSearchQuery("");
                        }}>
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>
                              {user.name.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {user.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        </div>
        {selectedMembers.length === 0 && (
          <p className="text-sm text-muted-foreground">Please Select atleast one other member</p>
        )}
      </div>
      <DialogFooter>
        <Button type='button' variant="outline" onClick={() => handleClose()}>
         Close
        </Button>
        <Button type='submit' disabled={isSubmitting || searchedUsers?.length===0}>
          {isSubmitting ? "Creating..." : "Create Group"}
        </Button>
      </DialogFooter>
    </form>
    
  </DialogContent>
</Dialog>
  )
}

export default CreateGroupModal

