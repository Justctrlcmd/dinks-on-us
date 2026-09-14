"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { ChangePasswordForm } from "@/forms/account/change-password-form";
import { UpdateProfileForm } from "@/forms/account/update-profile-form";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
export function ProfileView() { const { data: user } = useCurrentUser(); if (!user) return <LoadingState message="Loading your profile..." />; return <div className="grid gap-8"><PageHeader title="Profile" description="Manage your generic account details and password." /><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Account details</CardTitle><CardDescription>Changing your email requires verification again.</CardDescription></CardHeader><CardContent className="lg:flex lg:flex-1 lg:flex-col"><UpdateProfileForm user={user} /></CardContent></Card><Card><CardHeader><CardTitle>Password</CardTitle><CardDescription>Use a unique password you do not use elsewhere.</CardDescription></CardHeader><CardContent className="lg:flex lg:flex-1 lg:flex-col"><ChangePasswordForm /></CardContent></Card></div></div>; }
