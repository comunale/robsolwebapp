import CampaignForm from '@/components/admin/CampaignForm'

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CampaignForm campaignId={id} />
}
