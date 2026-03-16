"use client"

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/convex/_generated/api'
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { Group, User } from '@/lib/models';
import { useQuery } from 'convex/react'
import { Link, Plus, User as UserIcon, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { BarLoader } from 'react-spinners';
import CreateGroupModal from './_components/create-group-modal';
import router from 'next/dist/shared/lib/router/router';
import { useRouter, useSearchParams } from 'next/navigation';

function Contactspage() {
  const { data, loading, error } = useFetchQuery(api.contacts.getAllContacts);
  const { users, groups } = (data ?? { users: [], groups: [] }) as { users: User[]; groups: Group[] };
  const [isGroupCreateModalOpen, setIsGroupCreateModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("createGroup")) {
      setIsGroupCreateModalOpen(true);
      const url= new URL(window.location.href);
      url.searchParams.delete("createGroup");
      router.replace(url.pathname+url.search);
    }
  }, [searchParams,router]);
  return (
    <div className='container mx-auto py-6 px-6'>
      {loading && 
      <div className='container mx-auto py-12'>
        <BarLoader width={"100%"} color='#0000FF' />
      </div>}
      <div className='flex items-center justify-between mb-6'>
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={()=>setIsGroupCreateModalOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Create Group
        </Button>
      </div>
      <div className='grid grid-cols-2 gap-6'>
        <div className='bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-md'>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <UserIcon className="mr-2 h-4 w-4" />
              People
          </h2>
          {users.length===0?
            <Card>
              <CardContent className=''>
                <p >No contacts found</p>
              </CardContent>
            </Card>
            : 
            <div className='flex flex-col gap-4'>
              {users.map((user)=>
               <Link key={user._id} href={`/person/${user._id}`}>
                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center'>
                      <div className='bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16' />
                      <div className='ml-4'>
                        <p>{user.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
               </Link>
              )}
            </div>
          }
        </div>
        <div className='bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-md'>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Users className="mr-2 h-4 w-4" />
              Groups
          </h2>
            {groups.length===0?
            <Card>
              <CardContent className=''>
                <p >No groups found</p>
              </CardContent>
            </Card>
            : 
            <div className='flex flex-col gap-4'>
              {groups.map((group)=>
               <Link key={group._id} href={`/group/${group._id}`}>
                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center'>
                      <div className='bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16' />
                      <Users />
                      <div className='ml-4'>
                        <p>{group.name}</p>
                        <p>{group.members.length} members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
               </Link>
              )}
              
            </div>
          }
        </div>
      </div>
      <CreateGroupModal 
      isOpen={isGroupCreateModalOpen} 
      onClose={() => setIsGroupCreateModalOpen(false)} 
      onSuccess={(groupId: string) => router.push(`/group/${groupId}`)} />
    </div>
  )
}

export default Contactspage
