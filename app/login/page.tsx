import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
export const metadata={title:"Member Login"};
export default function Login(){return <section className="section auth-page"><div className="container auth-shell"><div><span className="eyebrow">Member Portal</span><h1>Welcome back.</h1><p>Sign in to access your returnee profile, support requests, resources and member opportunities.</p><p className="muted">Not a member yet? <Link href="/join">Join URO</Link>.</p></div><LoginForm/></div></section>}
