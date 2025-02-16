import './login-page.scoped.css';

import { Link, Redirect, useLocation } from 'react-router-dom';
import Particles from 'react-particles-js';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import PageWrapper from '../page-wrapper';
import Input from '../../utils/input/input';
import NormalButton from '../../utils/buttons/normal-button';
import { loginUser, forgotPasswordEmail, sendVerifyCode } from '../../../store/auth';
import { useState } from 'react';
import VerifyCodeInput from './verify-code-input';

const LoginPage: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { register, handleSubmit, getValues } = useForm();
  const user = useSelector((s: Store.AppState) => s.auth.user);
  const shouldVerify = useSelector((s: Store.AppState) => s.auth.shouldVerify);
  const query = new URLSearchParams(useLocation().search);
  const [email, setEmail] = useState(query.get('email') ?? '');

  const onLogin = (data) => dispatch(loginUser(data));
  const resetPassword = () => dispatch(forgotPasswordEmail(getValues().email));

  return (user)
    ? <Redirect to="/channels/@me" />
    : (
      <PageWrapper pageTitle="accord.app | Login">
        <div className="flex items-center absolute justify-center h-screen">
          <form
            className="rounded-md shadow bg-bg-primary p-8"
            onSubmit={handleSubmit(onLogin)}>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="lead">We're so excited to see you again!</p>

            <Input
              label="Email"
              name="email"
              register={register}
              className="mt-3"
              defaultValue={email!}
              onInput={(e) => setEmail(e.currentTarget.value)} />
            <Input
              label="Password"
              name="password"
              type="password"
              register={register}
              className="mt-3" />
            <Link to="#" onClick={resetPassword}>Forgot your password?</Link>

            {shouldVerify && <VerifyCodeInput />}

            <NormalButton className="bg-primary font w-full h-11 rounded-md mt-8">
              {(shouldVerify) ? 'Resend Code' : 'Login'}
            </NormalButton>
            <p className="mt-2">Need an account? <Link to={`/register${email && `?email=${email}`}`}>Register</Link></p>
          </form>
        </div>
        <Particles width="100%" height="100%" />
      </PageWrapper>
    );
}

export default LoginPage;