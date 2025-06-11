import { startTransition } from "react";
import { useOptimistic } from "react";
import { useActionState } from "react";

const fetch = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(null);
            // reject('姓名不存在');
        }, 1000);
    })
}

let initialValue = ''

const FormComp = () => {
    const [error, submitAction, isPending] = useActionState(submit)
    const [optimisticName, setOptimisticName] = useOptimistic(initialValue)

    async function submit(previousState, formData) {
        startTransition(async () => {
            setOptimisticName(formData?.get('name'))
        })
        const err = await fetch().catch(err => {
            return err
        })
        if (err) {
            setOptimisticName('')
            return { name: err }
        }
        initialValue = formData?.get('name')
        // alert('提交成功');
        return null
    }


    return <div>
        <form action={submitAction}>
            <p>optimisticName: {optimisticName}</p>
            <label htmlFor="name">name: </label>
            <input type="text" id="name" name="name" autoComplete="off" />
            {error && <div style={{ color: 'red' }}>{error.name}</div>}
            <button type="submit" onClick={submit} disabled={isPending}>{isPending ? 'submiting' : 'submit'}</button>
        </form>
    </div>
}

export default FormComp;