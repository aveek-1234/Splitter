import { api } from '@/convex/_generated/api';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { GroupMemberDetail, User } from '@/lib/models';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

interface GroupMembersProps {
  // Define member properties here
  members: (GroupMemberDetail | null)[]
}

const GroupMembers = ({ members }: GroupMembersProps ) => {
  const {data:currentUser}:{data?:User}= useFetchQuery(api.users.getCurrentUser);
  if (!members || (Array.isArray(members) && members.length === 0)) {
    return (
      <div className="text-gray-500 text-center py-4">
        No members present in this group
      </div>
    );
  }
  return (
    <div>
      {
        members.map((member)=>{
          const isMe= member?.id === currentUser?._id
          return(
            <div key={member?.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member?.imageUrl} />
                <AvatarFallback>{member?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {isMe ? "You" : member?.name}
                  </span>
                  {isMe && (
                    <Badge variant="outline" className="text-xs py-0 h-5">
                      You
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        })
      }
      
    </div>
  );
};

export default GroupMembers
