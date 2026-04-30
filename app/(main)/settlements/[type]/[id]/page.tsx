"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useFetchQuery } from "@/hooks/useFetchQuery";
import { useMutateQuery } from "@/hooks/useMutateQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BarLoader } from "react-spinners";
import type { User } from "@/lib/models";
import { GetSettlementsResult } from "@/convex/settlement";


export default function SettlementPage() {
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;

  const { data, loading, error } = useFetchQuery<GetSettlementsResult>(
    api.settlement.getSettlements,
    { type, id }
  );

  const { data: currentUser } = useFetchQuery<User>(api.users.getCurrentUser);
  const { mutate: createSettlement, loading: settling } = useMutateQuery(
    api.settlement.createSettlement
  );

  const [userAmount, setUserAmount] = useState("");
  const [groupAmounts, setGroupAmounts] = useState<Record<string, string>>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <BarLoader width={"100%"} color="#000080" />
      </div>
    );
  }

  if (error || !data) {
    return <div>Error: {error}</div>;
  }

  const handleUserSettlement = async () => {
    if (!data.otheruserDetails || !currentUser) return;

    const amount = parseFloat(userAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await createSettlement({
        amount,
        paidByUserId: currentUser._id,
        receivedByUserId: data.otheruserDetails._id,
      });
      toast.success("Settlement created successfully");
      setUserAmount("");
      // Optionally refetch data
    } catch (err) {
      toast.error("Failed to create settlement");
    }
  };

  const handleGroupSettlement = async () => {
    if (!data.group || !currentUser) return;

    const settlements = Array.from(selectedUsers).map((userId) => {
      const amount = parseFloat(groupAmounts[userId] || "0");
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount for user ${userId}`);
      }
      return {
        amount,
        paidByUserId: currentUser._id,
        receivedByUserId: userId as string,
        groupId: data.group.id,
      };
    });

    try {
      await Promise.all(
        settlements.map((settlement) => createSettlement(settlement))
      );
      toast.success("Settlements created successfully");
      setGroupAmounts({});
      setSelectedUsers(new Set());
      // Optionally refetch data
    } catch (err) {
      toast.error("Failed to create settlements");
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  if (data.type === "user") {
    const otherUser = data.otheruserDetails;
    const userBalance = data.balanceDetails.find(
      (b) => b.userId != otherUser?._id
    );
    const shouldShowSettlement = userBalance && userBalance.netBalance < 0;

    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Settle with {otherUser?.name}</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={otherUser?.imageUrl || ""} />
                <AvatarFallback>
                  {otherUser?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {otherUser?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shouldShowSettlement ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount you pay to {otherUser?.name}</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={userAmount}
                    onChange={(e) => setUserAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <Button
                  onClick={handleUserSettlement}
                  disabled={settling || !userAmount}
                >
                  {settling ? "Settling..." : "Settle"}
                </Button>
              </div>
            ) : (
              <p>No outstanding balance to settle.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.type === "group") {
    const group = data.group;
    const membersOwing = data.balanceDetails.filter((b) => b.netBalance > 0);

    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Settle in {group?.name}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{group?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {membersOwing.length > 0 ? (
              <div className="space-y-4">
                {membersOwing.map((member) => (
                  <div key={member.userId} className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedUsers.has(member.userId)}
                      onCheckedChange={() => toggleUserSelection(member.userId)}
                    />
                    <Avatar>
                      <AvatarImage src={member.imageUrl || ""} />
                      <AvatarFallback>
                        {member.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p>{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Owes you: ₹{member.netBalance.toFixed(2)}
                      </p>
                    </div>
                    {selectedUsers.has(member.userId) && (
                      <div>
                        <Label htmlFor={`amount-${member.userId}`}>
                          Amount received
                        </Label>
                        <Input
                          id={`amount-${member.userId}`}
                          type="number"
                          value={groupAmounts[member.userId] || ""}
                          onChange={(e) =>
                            setGroupAmounts((prev) => ({
                              ...prev,
                              [member.userId]: e.target.value,
                            }))
                          }
                          placeholder="Enter amount"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  onClick={handleGroupSettlement}
                  disabled={settling || selectedUsers.size === 0}
                >
                  {settling ? "Settling..." : "Settle Selected"}
                </Button>
              </div>
            ) : (
              <p>No outstanding balances to settle.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
